import { NextResponse } from "next/server";
import { buildSummary } from "@/lib/aggregate";
import { generateMockUsage } from "@/lib/mock-data";
import { fetchOpenAiUsageDaily } from "@/lib/openai-usage";
import { getSupabaseAdmin, type TokenUsageRow } from "@/lib/supabase";
import type { GridKey } from "@/config/emissions";
import type { DailyUsage, UsageSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/usage?days=30&grid=global
 *
 * Fallback-kedja (i ordning):
 *   1. Supabase  — snabbt, aggregerat, cachat av sync-jobbet
 *   2. OpenAI    — direkt live-hämtning om Supabase inte är konfigurerat
 *   3. Mock      — deterministisk testdata så att UI alltid renderas
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = clampInt(searchParams.get("days"), 7, 90, 30);
  const grid: GridKey =
    searchParams.get("grid") === "sweden" ? "sweden" : "global";

  const source = await resolveData(days);
  const previous = source.days.slice(0, days);
  const current = source.days.slice(days);

  const summary: UsageSummary = buildSummary(
    current,
    previous,
    grid,
    source.source,
  );
  return NextResponse.json(summary);
}

async function resolveData(
  days: number,
): Promise<{ days: DailyUsage[]; source: "live" | "mock" }> {
  const supabase = getSupabaseAdmin();

  // 1. Försök Supabase
  if (supabase) {
    try {
      const since = daysAgoIso(days * 2);
      const { data, error } = await supabase
        .from("token_usage_daily")
        .select(
          "day, input_tokens, output_tokens, total_tokens, energy_kwh, co2_kg_global, co2_kg_sweden",
        )
        .gte("day", since)
        .order("day", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const rows = data as Pick<
          TokenUsageRow,
          | "day"
          | "input_tokens"
          | "output_tokens"
          | "total_tokens"
        >[];
        const byDay = new Map<string, DailyUsage>();
        for (const r of rows) {
          const existing = byDay.get(r.day);
          if (existing) {
            existing.inputTokens += Number(r.input_tokens);
            existing.outputTokens += Number(r.output_tokens);
            existing.totalTokens = existing.inputTokens + existing.outputTokens;
          } else {
            byDay.set(r.day, {
              date: r.day,
              inputTokens: Number(r.input_tokens),
              outputTokens: Number(r.output_tokens),
              totalTokens:
                Number(r.input_tokens) + Number(r.output_tokens),
            });
          }
        }
        const filled = fillMissingDays(
          Array.from(byDay.values()).sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
          days * 2,
        );
        return { days: filled, source: "live" };
      }
    } catch (err) {
      console.error("[api/usage] supabase read failed:", err);
    }
  }

  // 2. Direkt-live mot OpenAI (ingen Supabase eller tomt resultat)
  if (process.env.OPENAI_ADMIN_KEY) {
    try {
      const raw = await fetchOpenAiUsageDaily(days * 2);
      return { days: fillMissingDays(raw, days * 2), source: "live" };
    } catch (err) {
      console.error("[api/usage] openai live failed:", err);
    }
  }

  // 3. Mock
  return { days: generateMockUsage(days * 2), source: "mock" };
}

/**
 * Fyller i nolldagar för datum som saknas, så att grafen alltid har en
 * punkt per dag även om OpenAI inte returnerade en bucket.
 */
function fillMissingDays(rows: DailyUsage[], totalDays: number): DailyUsage[] {
  const map = new Map(rows.map((r) => [r.date, r]));
  const out: DailyUsage[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push(
      map.get(key) ?? {
        date: key,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
    );
  }
  return out;
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

function clampInt(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

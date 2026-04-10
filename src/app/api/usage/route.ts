import { NextResponse } from "next/server";
import { buildSummary } from "@/lib/aggregate";
import { fetchOpenAiUsageDaily } from "@/lib/openai-usage";
import { getSupabaseAdmin, type TokenUsageRow } from "@/lib/supabase";
import type { GridKey } from "@/config/emissions";
import type { DailyUsage, DataSource, UsageSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/usage?days=30&grid=global
 *
 * Live-only. Försöker i ordning:
 *   1. Supabase-tabellen `token_usage_daily` (primär källa)
 *   2. OpenAI Usage API direkt (fallback om Supabase är tom)
 *
 * Om båda misslyckas returneras 500 med ett beskrivande felmeddelande.
 * Ingen mockdata längre — dashboarden ska antingen visa riktiga siffror
 * eller säga exakt vad som gick fel.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = clampInt(searchParams.get("days"), 7, 90, 30);
  const grid: GridKey =
    searchParams.get("grid") === "sweden" ? "sweden" : "global";

  const errors: string[] = [];

  // 1. Supabase
  const fromSupabase = await tryReadSupabase(days, errors);
  if (fromSupabase && fromSupabase.length > 0) {
    return summaryResponse(fromSupabase, days, grid, "supabase");
  }

  // 2. OpenAI direkt
  const fromOpenAi = await tryReadOpenAi(days, errors);
  if (fromOpenAi && fromOpenAi.length > 0) {
    return summaryResponse(fromOpenAi, days, grid, "openai-live");
  }

  // Inget fungerade → explicit fel
  return NextResponse.json(
    {
      error: "Kunde inte hämta användningsdata från någon källa.",
      details: errors,
      hints: [
        "Kontrollera att SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY och OPENAI_ADMIN_KEY är satta i Vercel.",
        "Kör en Redeploy i Vercel efter att env vars ändrats.",
        "Kör SQL-migrationen i Supabase (supabase/migrations/0001_initial.sql).",
        "Trigga /api/sync en gång för att populera tabellen.",
      ],
    },
    { status: 500 },
  );
}

async function tryReadSupabase(
  days: number,
  errors: string[],
): Promise<DailyUsage[] | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    errors.push(
      "Supabase: SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY saknas i miljön.",
    );
    return null;
  }

  try {
    const since = daysAgoIso(days * 2);
    const { data, error } = await supabase
      .from("token_usage_daily")
      .select("day, input_tokens, output_tokens")
      .gte("day", since)
      .order("day", { ascending: true });

    if (error) {
      errors.push(`Supabase: ${error.message}`);
      return null;
    }

    if (!data || data.length === 0) {
      errors.push(
        "Supabase: tabellen token_usage_daily är tom (kör /api/sync eller trigga GitHub Actions-workflowen).",
      );
      return null;
    }

    const rows = data as Pick<
      TokenUsageRow,
      "day" | "input_tokens" | "output_tokens"
    >[];

    const byDay = new Map<string, DailyUsage>();
    for (const r of rows) {
      const input = Number(r.input_tokens);
      const output = Number(r.output_tokens);
      const existing = byDay.get(r.day);
      if (existing) {
        existing.inputTokens += input;
        existing.outputTokens += output;
        existing.totalTokens = existing.inputTokens + existing.outputTokens;
      } else {
        byDay.set(r.day, {
          date: r.day,
          inputTokens: input,
          outputTokens: output,
          totalTokens: input + output,
        });
      }
    }

    return fillMissingDays(
      Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
      days * 2,
    );
  } catch (err) {
    errors.push(`Supabase: ${asMessage(err)}`);
    return null;
  }
}

async function tryReadOpenAi(
  days: number,
  errors: string[],
): Promise<DailyUsage[] | null> {
  if (!process.env.OPENAI_ADMIN_KEY) {
    errors.push("OpenAI: OPENAI_ADMIN_KEY saknas i miljön.");
    return null;
  }

  try {
    const raw = await fetchOpenAiUsageDaily(days * 2);
    if (raw.length === 0) {
      errors.push(
        "OpenAI: Usage API returnerade 0 rader (har orgen någon trafik de senaste dagarna?).",
      );
      return null;
    }
    return fillMissingDays(raw, days * 2);
  } catch (err) {
    errors.push(`OpenAI: ${asMessage(err)}`);
    return null;
  }
}

function summaryResponse(
  all: DailyUsage[],
  days: number,
  grid: GridKey,
  source: DataSource,
) {
  const previous = all.slice(0, days);
  const current = all.slice(days);
  const summary: UsageSummary = buildSummary(current, previous, grid, source);
  return NextResponse.json(summary);
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

function asMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

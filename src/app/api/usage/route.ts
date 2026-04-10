import { NextResponse } from "next/server";
import { buildSummary } from "@/lib/aggregate";
import { fetchOpenAiUsageDaily } from "@/lib/openai-usage";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { GridKey } from "@/config/emissions";
import type { DailyUsage, DataSource, UsageSummary } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/usage?days=30&grid=global
 *
 * Live-only. Försöker i ordning:
 *   1. Supabase-tabellen `token_usage_events` (primär källa — loggad av /api/chat)
 *   2. OpenAI Usage API direkt (fallback om events är tomma OCH admin-nyckeln
 *      tillhör en org med Platform API-trafik)
 *
 * Om båda misslyckas returneras 500 med ett beskrivande felmeddelande.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = clampInt(searchParams.get("days"), 7, 90, 30);
  const grid: GridKey =
    searchParams.get("grid") === "sweden" ? "sweden" : "global";

  const errors: string[] = [];

  // 1. token_usage_events (från vår egna chat)
  const fromEvents = await tryReadEvents(days, errors);
  if (fromEvents && fromEvents.length > 0) {
    return summaryResponse(fromEvents, days, grid, "supabase");
  }

  // 2. OpenAI Usage API direkt (fallback — funkar bara om orgen har Platform API-trafik)
  const fromOpenAi = await tryReadOpenAi(days, errors);
  if (fromOpenAi && fromOpenAi.length > 0) {
    return summaryResponse(fromOpenAi, days, grid, "openai-live");
  }

  // Inget fungerade → explicit fel med hjälp
  return NextResponse.json(
    {
      error: "Kunde inte hämta användningsdata från någon källa.",
      details: errors,
      hints: [
        "Öppna /chat och skicka ett meddelande — då loggas det automatiskt till Supabase.",
        "Kontrollera att OPENAI_API_KEY (projektnyckel), SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY är satta i Vercel.",
        "Kör migrationen 0002_chat_events.sql i Supabase SQL Editor.",
        "Kör Redeploy i Vercel efter att env vars ändrats.",
      ],
    },
    { status: 500 },
  );
}

async function tryReadEvents(
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
    // Använd RPC för att aggregera på Postgres-sidan
    const { data, error } = await supabase.rpc("get_daily_usage", {
      since,
    });

    if (error) {
      // Vanligaste orsak: migrationen 0002 är inte körd än
      errors.push(
        `Supabase RPC get_daily_usage: ${error.message}. Kör migrationen 0002_chat_events.sql.`,
      );
      return null;
    }

    const rows = (data ?? []) as Array<{
      day: string;
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
    }>;

    if (rows.length === 0) {
      errors.push(
        "Supabase: token_usage_events är tom. Öppna /chat och skicka ett meddelande för att generera första datapunkten.",
      );
      return null;
    }

    const daily: DailyUsage[] = rows.map((r) => ({
      date: r.day,
      inputTokens: Number(r.input_tokens),
      outputTokens: Number(r.output_tokens),
      totalTokens: Number(r.total_tokens),
    }));

    return fillMissingDays(daily, days * 2);
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
    // Inte ett fel — admin-nyckel är valfri när vi har chat-events
    return null;
  }

  try {
    const raw = await fetchOpenAiUsageDaily(days * 2);
    if (raw.length === 0) {
      errors.push(
        "OpenAI: Usage API svarade men returnerade ingen trafik (admin-nyckeln tillhör en org utan Platform API-anrop — helt normalt för ChatGPT Business-användare).",
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
 * punkt per dag även om inget hände på just den dagen.
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

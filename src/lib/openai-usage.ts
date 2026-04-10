/**
 * OpenAI Usage API-klient.
 *
 * Endpoint:  GET https://api.openai.com/v1/organization/usage/completions
 * Docs:      https://platform.openai.com/docs/api-reference/usage/completions
 *
 * Kräver en ADMIN-nyckel (sk-admin-...). Regulära projekt-nycklar fungerar inte.
 */

import type { DailyUsage } from "./types";

export type UsageBucketRow = {
  day: string;
  projectId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

type OpenAiUsageBucketResult = {
  object: string;
  input_tokens?: number;
  output_tokens?: number;
  num_model_requests?: number;
  model?: string;
  project_id?: string;
};

type OpenAiUsageBucket = {
  object: "bucket";
  start_time: number;
  end_time: number;
  results?: OpenAiUsageBucketResult[];
};

type OpenAiUsageResponse = {
  object: "page";
  data: OpenAiUsageBucket[];
  has_more: boolean;
  next_page?: string;
};

/**
 * Hämtar detaljerad usage och returnerar en rad per (dag, projekt, modell).
 * Det är den version sync-jobbet använder för att fylla Supabase.
 */
export async function fetchOpenAiUsageBuckets(
  days: number,
): Promise<UsageBucketRow[]> {
  const key = requireKey();
  const now = Math.floor(Date.now() / 1000);
  const todayUtcMidnight = now - (now % 86400);
  const startTime = todayUtcMidnight - (days - 1) * 86400;

  const params = new URLSearchParams({
    start_time: String(startTime),
    bucket_width: "1d",
    // Gruppera per projekt och modell så att vi kan bryta ned i dashboarden
    group_by: "project_id,model",
    limit: String(days),
  });

  const url = `https://api.openai.com/v1/organization/usage/completions?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `OpenAI Usage API returned ${res.status} ${res.statusText}: ${body}`,
    );
  }

  const json = (await res.json()) as OpenAiUsageResponse;

  const out: UsageBucketRow[] = [];
  for (const bucket of json.data) {
    const day = new Date(bucket.start_time * 1000).toISOString().slice(0, 10);
    for (const r of bucket.results ?? []) {
      out.push({
        day,
        projectId: r.project_id ?? "",
        model: r.model ?? "",
        inputTokens: r.input_tokens ?? 0,
        outputTokens: r.output_tokens ?? 0,
      });
    }
  }
  return out;
}

/**
 * Tunn aggregering per dag — används av den direkta live-pathen i /api/usage
 * när Supabase inte är konfigurerat.
 */
export async function fetchOpenAiUsageDaily(
  days: number,
): Promise<DailyUsage[]> {
  const buckets = await fetchOpenAiUsageBuckets(days);
  const byDay = new Map<string, DailyUsage>();
  for (const b of buckets) {
    const existing = byDay.get(b.day);
    if (existing) {
      existing.inputTokens += b.inputTokens;
      existing.outputTokens += b.outputTokens;
      existing.totalTokens = existing.inputTokens + existing.outputTokens;
    } else {
      byDay.set(b.day, {
        date: b.day,
        inputTokens: b.inputTokens,
        outputTokens: b.outputTokens,
        totalTokens: b.inputTokens + b.outputTokens,
      });
    }
  }
  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function requireKey(): string {
  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) throw new Error("OPENAI_ADMIN_KEY is not set");
  return key;
}

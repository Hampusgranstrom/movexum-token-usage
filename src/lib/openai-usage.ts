/**
 * OpenAI Usage API-klient.
 *
 * Endpoint:  GET https://api.openai.com/v1/organization/usage/completions
 * Docs:      https://platform.openai.com/docs/api-reference/usage/completions
 *
 * Kräver en ADMIN-nyckel (sk-admin-...). Regulära projekt-nycklar fungerar inte.
 *
 * OpenAI begränsar antalet buckets per anrop: max 31 för bucket_width=1d.
 * Den här klienten paginerar automatiskt i 31-dagars-chunkar för att kunna
 * hämta längre perioder (t.ex. 60 dagar för delta-beräkning).
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

const SECONDS_PER_DAY = 86400;
/** OpenAI:s maxgräns för `limit` när `bucket_width=1d`. */
const MAX_DAYS_PER_CALL = 31;

/**
 * Hämtar detaljerad usage och returnerar en rad per (dag, projekt, modell).
 * Paginerar automatiskt om `days` > 31.
 */
export async function fetchOpenAiUsageBuckets(
  days: number,
): Promise<UsageBucketRow[]> {
  const key = requireKey();

  const now = Math.floor(Date.now() / 1000);
  const todayUtcMidnight = now - (now % SECONDS_PER_DAY);
  const endOfTodayExclusive = todayUtcMidnight + SECONDS_PER_DAY;
  const oldestStart = todayUtcMidnight - (days - 1) * SECONDS_PER_DAY;

  const out: UsageBucketRow[] = [];
  let cursorStart = oldestStart;

  while (cursorStart < endOfTodayExclusive) {
    const chunkEnd = Math.min(
      cursorStart + MAX_DAYS_PER_CALL * SECONDS_PER_DAY,
      endOfTodayExclusive,
    );
    const chunkDays = Math.round((chunkEnd - cursorStart) / SECONDS_PER_DAY);

    const rows = await fetchChunk(key, cursorStart, chunkEnd, chunkDays);
    out.push(...rows);

    cursorStart = chunkEnd;
  }

  return out;
}

async function fetchChunk(
  key: string,
  startTime: number,
  endTime: number,
  limit: number,
): Promise<UsageBucketRow[]> {
  // Ingen group_by — vi vill ha enkla aggregerade dagsbuckets. Per-projekt
  // och per-modell-uppdelning kan läggas till senare när dashboarden stödjer
  // det visuellt.
  const params = new URLSearchParams({
    start_time: String(startTime),
    end_time: String(endTime),
    bucket_width: "1d",
    limit: String(Math.min(limit, MAX_DAYS_PER_CALL)),
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

  // Debug-logg: hur många buckets kom tillbaka och hur mycket data i dem?
  // Syns i Vercel Functions-loggarna.
  const bucketCount = json.data?.length ?? 0;
  const nonEmptyBuckets =
    json.data?.filter((b) => (b.results?.length ?? 0) > 0).length ?? 0;
  console.log(
    `[openai-usage] chunk ${new Date(startTime * 1000)
      .toISOString()
      .slice(0, 10)} → ${new Date(endTime * 1000)
      .toISOString()
      .slice(0, 10)}: ${bucketCount} buckets, ${nonEmptyBuckets} med data`,
  );

  const out: UsageBucketRow[] = [];
  for (const bucket of json.data ?? []) {
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
 * när Supabase inte är konfigurerat eller tomt.
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

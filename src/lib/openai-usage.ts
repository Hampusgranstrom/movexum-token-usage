import type { DailyUsage } from "./types";

/**
 * Hämtar completions-usage från OpenAI Usage API och aggregerar per dag.
 *
 * Endpoint:  GET https://api.openai.com/v1/organization/usage/completions
 * Kräver en ADMIN-nyckel (sk-admin-...). Regulära projekt-nycklar fungerar inte.
 *
 * Docs: https://platform.openai.com/docs/api-reference/usage/completions
 */
export async function fetchOpenAiUsage(days: number): Promise<DailyUsage[]> {
  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) {
    throw new Error("OPENAI_ADMIN_KEY is not set");
  }

  const now = Math.floor(Date.now() / 1000);
  // Rulla tillbaka till midnatt UTC, sen `days` dagar bakåt.
  const todayUtcMidnight = now - (now % 86400);
  const startTime = todayUtcMidnight - (days - 1) * 86400;

  const params = new URLSearchParams({
    start_time: String(startTime),
    bucket_width: "1d",
    limit: String(days),
  });

  const url = `https://api.openai.com/v1/organization/usage/completions?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    // Undvik att Next cachar svaret mellan anrop
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `OpenAI Usage API returned ${res.status} ${res.statusText}: ${body}`,
    );
  }

  const json = (await res.json()) as OpenAiUsageResponse;

  // Svaret innehåller "buckets", en per dag. Varje bucket har ett "results"-
  // array med aggregerad data som vi summerar till en dagssiffra.
  const out: DailyUsage[] = json.data.map((bucket) => {
    const date = new Date(bucket.start_time * 1000).toISOString().slice(0, 10);
    let inputTokens = 0;
    let outputTokens = 0;
    for (const r of bucket.results ?? []) {
      inputTokens += r.input_tokens ?? 0;
      outputTokens += r.output_tokens ?? 0;
    }
    return {
      date,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  });

  return out;
}

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

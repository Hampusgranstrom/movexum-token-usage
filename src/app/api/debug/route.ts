import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/debug — skyddad diagnostik-endpoint.
 *
 * Gör två anrop mot OpenAI Admin API:
 *   1. /v1/organization/projects           — vilka projekt finns i orgen?
 *   2. /v1/organization/usage/completions  — vad svarar usage-endpointen?
 *
 * Returnerar råsvar + metadata så vi kan se exakt vad admin-nyckeln "ser".
 *
 * Auth: Bearer Authorization-header ELLER ?secret=... query-param.
 * Query-paramet finns för att debuggen ska kunna öppnas direkt i browsern.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!authorized(request, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OPENAI_ADMIN_KEY saknas i Vercel env vars" },
      { status: 500 },
    );
  }

  const diagnostics: Record<string, unknown> = {
    admin_key_prefix: key.slice(0, 11) + "...",
    admin_key_length: key.length,
    admin_key_looks_like_admin: key.startsWith("sk-admin-"),
    now_utc: new Date().toISOString(),
  };

  // 1. Lista projekt i orgen — visar om nyckeln funkar och vilken org vi är i
  diagnostics.projects = await safeFetch(
    "https://api.openai.com/v1/organization/projects?limit=20",
    key,
  );

  // 2. Usage senaste 30 dagarna (utan group_by)
  const now = Math.floor(Date.now() / 1000);
  const todayUtcMidnight = now - (now % 86400);
  const startTime = todayUtcMidnight - 29 * 86400;
  const endTime = todayUtcMidnight + 86400;

  const usageUrl = `https://api.openai.com/v1/organization/usage/completions?${new URLSearchParams(
    {
      start_time: String(startTime),
      end_time: String(endTime),
      bucket_width: "1d",
      limit: "31",
    },
  ).toString()}`;

  const usage = await safeFetch(usageUrl, key);
  diagnostics.usage = {
    url: usageUrl,
    start_date: new Date(startTime * 1000).toISOString().slice(0, 10),
    end_date: new Date(endTime * 1000).toISOString().slice(0, 10),
    ...usage,
  };

  // Summera usage-datan om svaret lyckades
  if (
    usage.ok &&
    usage.body &&
    typeof usage.body === "object" &&
    "data" in usage.body
  ) {
    const data = (usage.body as { data?: unknown[] }).data ?? [];
    let totalResults = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    for (const bucket of data as Array<{
      results?: Array<{
        input_tokens?: number;
        output_tokens?: number;
      }>;
    }>) {
      const results = bucket.results ?? [];
      totalResults += results.length;
      for (const r of results) {
        totalInputTokens += r.input_tokens ?? 0;
        totalOutputTokens += r.output_tokens ?? 0;
      }
    }
    diagnostics.usage_summary = {
      bucket_count: data.length,
      total_result_entries: totalResults,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      verdict:
        totalInputTokens + totalOutputTokens > 0
          ? "OK — usage finns"
          : "TOMT — admin-nyckeln tillhör troligen en annan org eller orgen har ingen trafik",
    };
  }

  return NextResponse.json(diagnostics, { status: 200 });
}

type FetchResult = {
  ok: boolean;
  status?: number;
  status_text?: string;
  body?: unknown;
  error?: string;
};

async function safeFetch(url: string, key: string): Promise<FetchResult> {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return {
      ok: res.ok,
      status: res.status,
      status_text: res.statusText,
      body,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function authorized(request: Request, url: URL): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  // 1. Authorization: Bearer <secret>
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "");
  if (bearer && bearer === expected) return true;

  // 2. ?secret=... query-param (för debug i browser)
  const qs = url.searchParams.get("secret");
  if (qs && qs === expected) return true;

  return false;
}

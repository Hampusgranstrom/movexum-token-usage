import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/debug — skyddad diagnostik-endpoint.
 *
 * Skickar ett enkelt anrop till OpenAI Usage API och returnerar den RÅA
 * responsen (plus metadata). Används för att se exakt vad OpenAI svarar
 * när dashboarden säger "0 rader".
 *
 * Kräver Bearer $CRON_SECRET i produktion.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const key = process.env.OPENAI_ADMIN_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "OPENAI_ADMIN_KEY saknas" },
      { status: 500 },
    );
  }

  // Senaste 7 dagarna
  const now = Math.floor(Date.now() / 1000);
  const todayUtcMidnight = now - (now % 86400);
  const startTime = todayUtcMidnight - 6 * 86400;
  const endTime = todayUtcMidnight + 86400;

  const params = new URLSearchParams({
    start_time: String(startTime),
    end_time: String(endTime),
    bucket_width: "1d",
    limit: "7",
  });

  const url = `https://api.openai.com/v1/organization/usage/completions?${params.toString()}`;

  const diagnostics: Record<string, unknown> = {
    url,
    start_time: startTime,
    end_time: endTime,
    start_date: new Date(startTime * 1000).toISOString().slice(0, 10),
    end_date: new Date(endTime * 1000).toISOString().slice(0, 10),
    admin_key_prefix: key.slice(0, 11) + "...",
    admin_key_length: key.length,
  };

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    diagnostics.http_status = res.status;
    diagnostics.http_status_text = res.statusText;

    const bodyText = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText;
    }

    diagnostics.raw_response = body;

    if (res.ok && body && typeof body === "object" && "data" in body) {
      const data = (body as { data?: unknown[] }).data ?? [];
      diagnostics.bucket_count = data.length;

      let totalResults = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for (const bucket of data as Array<{
        start_time?: number;
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

      diagnostics.total_results_in_all_buckets = totalResults;
      diagnostics.total_input_tokens = totalInputTokens;
      diagnostics.total_output_tokens = totalOutputTokens;
    }
  } catch (err) {
    diagnostics.fetch_error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(diagnostics, { status: 200 });
}

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "");
  return provided === expected;
}

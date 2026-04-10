import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Maxlängd för en sync-körning i sekunder (standardhosting klarar 60s)
export const maxDuration = 60;

/**
 * POST /api/sync  — skyddad med bearer token från CRON_SECRET
 * GET  /api/sync  — samma, men kan användas från en webbläsare vid debug
 *
 * Hämtar senaste 35 dagarnas usage från OpenAI och skriver in den i
 * Supabase. Anropas varje timme av GitHub Actions (.github/workflows/sync.yml)
 * eller manuellt under utveckling.
 */
async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSync(35);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/sync] failed:", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}

export const GET = handle;
export const POST = handle;

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Ingen secret satt → tillåt bara i dev
    return process.env.NODE_ENV !== "production";
  }
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "");
  return provided === expected;
}

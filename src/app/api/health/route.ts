import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe.
 * Returns 200 if the app is running and can talk to Supabase.
 * Does NOT check Anthropic (would add latency + cost on every probe);
 * Anthropic issues surface via /api/chat 5xx.
 */
export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { ok: false, reason: "supabase_env_missing" },
      { status: 503 },
    );
  }
  try {
    const { error } = await admin
      .from("modules")
      .select("id", { head: true, count: "exact" })
      .limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason: "db_unreachable",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 503 },
    );
  }
}

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logSecurityEvent } from "@/lib/security-log";

export const runtime = "nodejs";

/**
 * Runs the retention job (anonymizes leads outside the retention window).
 * Superadmin only. Safe to call repeatedly — the RPC is idempotent.
 * Schedule this from a cron / Supabase scheduled function for automation.
 */
export async function POST(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { data, error } = await admin.rpc("run_retention");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const anonymizedCount =
    (Array.isArray(data) && data[0]?.anonymized_count) ?? 0;

  await logSecurityEvent("retention_run", {
    actorId: guard.user.id,
    actorEmail: guard.user.email,
    metadata: { anonymized_count: Number(anonymizedCount) },
    headers: req.headers,
  });

  return NextResponse.json({ ok: true, anonymized: Number(anonymizedCount) });
}

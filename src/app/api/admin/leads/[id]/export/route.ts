import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logSecurityEvent } from "@/lib/security-log";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GDPR Art. 15 data export. Returns the full lead record plus all
 * conversations, messages, consent events and question responses for
 * that lead as a single JSON document. Response content-disposition
 * triggers a download.
 */
export async function GET(req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const [leadRes, convRes, consentRes, qrRes] = await Promise.all([
    admin.from("leads").select("*").eq("id", id).maybeSingle(),
    admin.from("conversations").select("*, messages(*)").eq("lead_id", id),
    admin.from("consent_events").select("*").eq("lead_id", id),
    admin.from("question_responses").select("*").eq("lead_id", id),
  ]);

  if (leadRes.error || !leadRes.data) {
    return NextResponse.json({ error: "lead not found" }, { status: 404 });
  }

  const payload = {
    exported_at: new Date().toISOString(),
    exported_by: guard.user.email,
    lead: leadRes.data,
    conversations: convRes.data ?? [],
    consent_events: consentRes.data ?? [],
    question_responses: qrRes.data ?? [],
  };

  await logSecurityEvent("export_lead", {
    actorId: guard.user.id,
    actorEmail: guard.user.email,
    targetId: id,
    headers: req.headers,
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="lead-${id}.json"`,
    },
  });
}

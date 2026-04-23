import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logSecurityEvent } from "@/lib/security-log";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GDPR Art. 17 — right to erasure. Hard-deletes the lead and cascades to
 * conversations/messages/question_responses/consent_events. Superadmin
 * only. The action is logged in security_events with the lead id so
 * you retain a record *that* data was deleted (but not the data itself).
 */
export async function DELETE(req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { error } = await admin.from("leads").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logSecurityEvent("delete_lead", {
    actorId: guard.user.id,
    actorEmail: guard.user.email,
    targetId: id,
    headers: req.headers,
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasConsent } from "@/lib/consent";
import { getModuleBySlug } from "@/lib/modules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Finalize a wizard flow: create a lead from the accumulated answers,
 * mark the module_session as completed, attach consent + responses to
 * the lead. Returns the created lead id.
 *
 * Known keys we promote to dedicated lead columns:
 *   name, email, phone, organization, idea_summary, idea_category
 * All other answers stay on question_responses for later analysis.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    sessionId?: string;
    answers?: Record<string, unknown>;
  } | null;

  if (!body?.sessionId || !body.answers) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const mod = await getModuleBySlug(slug);
  if (!mod) {
    return NextResponse.json({ error: "module not found" }, { status: 404 });
  }
  if (!(await hasConsent(mod.id, body.sessionId))) {
    return NextResponse.json({ error: "consent required" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const a = body.answers;
  const name = typeof a.name === "string" ? a.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const email = typeof a.email === "string" ? a.email.trim() : null;
  const phone = typeof a.phone === "string" ? a.phone.trim() : null;
  const organization =
    typeof a.organization === "string" ? a.organization.trim() : null;
  const idea_summary =
    typeof a.idea_summary === "string" ? a.idea_summary.trim() : null;
  const idea_category =
    typeof a.idea_category === "string" ? a.idea_category.trim() : null;

  if (mod.require_email && !email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }
  if (mod.require_phone && !phone) {
    return NextResponse.json({ error: "phone required" }, { status: 400 });
  }

  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .insert({
      name,
      email,
      phone,
      organization,
      idea_summary,
      idea_category,
      source_id: mod.lead_source_id ?? "web",
      status: "new",
      module_id: mod.id,
    })
    .select("id")
    .single();

  if (leadErr || !lead) {
    return NextResponse.json(
      { error: leadErr?.message ?? "failed to create lead" },
      { status: 500 },
    );
  }

  // Back-fill lead_id on everything associated with this session.
  await Promise.all([
    admin
      .from("question_responses")
      .update({ lead_id: lead.id })
      .eq("session_id", body.sessionId),
    admin
      .from("consent_events")
      .update({ lead_id: lead.id })
      .eq("session_id", body.sessionId)
      .eq("module_id", mod.id),
    admin
      .from("module_sessions")
      .update({ lead_id: lead.id, completed_at: new Date().toISOString() })
      .eq("module_id", mod.id)
      .eq("session_id", body.sessionId),
  ]);

  return NextResponse.json({ ok: true, leadId: lead.id });
}

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logSecurityEvent } from "@/lib/security-log";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED_FIELDS = new Set([
  "name",
  "description",
  "target_audience",
  "flow_type",
  "welcome_title",
  "welcome_body",
  "system_prompt",
  "consent_text",
  "consent_version",
  "lead_source_id",
  "accent_color",
  "hero_eyebrow",
  "is_active",
  "require_email",
  "require_phone",
  "result_buckets",
]);

export async function GET(_req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const { data, error } = await admin
    .from("modules")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ module: data });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(k)) patch[k] = v;
  }

  // If consent text changed, bump consent_version to invalidate prior consents.
  if (typeof patch.consent_text === "string") {
    const admin = getSupabaseAdmin();
    if (admin) {
      const { data: prev } = await admin
        .from("modules")
        .select("consent_text, consent_version")
        .eq("id", id)
        .maybeSingle();
      if (prev && prev.consent_text !== patch.consent_text) {
        patch.consent_version = (prev.consent_version ?? 1) + 1;
      }
    }
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const { data, error } = await admin
    .from("modules")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logSecurityEvent("module_update", {
    actorId: guard.user.id,
    actorEmail: guard.user.email,
    targetId: id,
    metadata: { fields: Object.keys(patch) },
    headers: req.headers,
  });

  return NextResponse.json({ module: data });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const { error } = await admin.from("modules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logSecurityEvent("module_delete", {
    actorId: guard.user.id,
    actorEmail: guard.user.email,
    targetId: id,
    headers: req.headers,
  });

  return NextResponse.json({ ok: true });
}

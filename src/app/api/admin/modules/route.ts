import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logSecurityEvent } from "@/lib/security-log";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("modules")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ modules: data ?? [] });
}

export async function POST(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug)) {
    return NextResponse.json(
      { error: "slug must match [a-z0-9-]{3,40}" },
      { status: 400 },
    );
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const insert = {
    slug,
    name,
    description: body.description ?? null,
    target_audience: body.target_audience ?? null,
    flow_type:
      body.flow_type === "chat" ||
      body.flow_type === "hybrid" ||
      body.flow_type === "quiz"
        ? body.flow_type
        : "wizard",
    welcome_title: body.welcome_title ?? null,
    welcome_body: body.welcome_body ?? null,
    system_prompt: body.system_prompt ?? null,
    consent_text:
      typeof body.consent_text === "string" && body.consent_text.trim().length > 0
        ? body.consent_text
        : "Genom att fortsätta samtycker du till att Movexum behandlar dina uppgifter.",
    consent_version: 1,
    lead_source_id: body.lead_source_id ?? null,
    accent_color: body.accent_color ?? null,
    hero_eyebrow: body.hero_eyebrow ?? null,
    is_active: body.is_active === false ? false : true,
    require_email: body.require_email === false ? false : true,
    require_phone: !!body.require_phone,
    require_organization: !!body.require_organization,
    chat_persona: typeof body.chat_persona === "string" ? body.chat_persona : null,
    max_exchanges: typeof body.max_exchanges === "number" ? body.max_exchanges : 20,
    result_buckets: Array.isArray(body.result_buckets) ? body.result_buckets : [],
    created_by: guard.user.id,
  };

  const { data, error } = await admin
    .from("modules")
    .insert(insert)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Seed an empty question set so the admin can start adding questions
  if (data) {
    await admin
      .from("question_sets")
      .insert({ module_id: data.id, name: "Default" });
  }

  await logSecurityEvent("module_create", {
    actorId: guard.user.id,
    actorEmail: guard.user.email,
    targetId: data?.id ?? null,
    metadata: { slug },
    headers: req.headers,
  });

  return NextResponse.json({ module: data });
}

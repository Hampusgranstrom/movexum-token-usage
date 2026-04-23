import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED = new Set(["label", "text", "help_text", "weight", "is_control", "ended_at"]);

export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED.has(k)) patch[k] = v;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const { data, error } = await admin
    .from("question_variants")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variant: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const { error } = await admin.from("question_variants").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

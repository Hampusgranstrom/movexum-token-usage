import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Create a new variant for a question. */
export async function POST(req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!text || !label) {
    return NextResponse.json({ error: "text and label required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const { data, error } = await admin
    .from("question_variants")
    .insert({
      question_id: id,
      label,
      text,
      help_text: body.help_text ?? null,
      weight: typeof body.weight === "number" ? body.weight : 50,
      is_control: !!body.is_control,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variant: data });
}

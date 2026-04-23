import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** List questions (+variants) for a module. Ensures a default set exists. */
export async function GET(_req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  let { data: sets } = await admin
    .from("question_sets")
    .select("*")
    .eq("module_id", id)
    .order("created_at", { ascending: true });

  if (!sets || sets.length === 0) {
    const { data: created } = await admin
      .from("question_sets")
      .insert({ module_id: id, name: "Default" })
      .select();
    sets = created ?? [];
  }

  const setId = sets[0]?.id;
  if (!setId) return NextResponse.json({ set: null, questions: [] });

  const { data: questions } = await admin
    .from("questions")
    .select("*")
    .eq("question_set_id", setId)
    .order("display_order", { ascending: true });

  const qIds = (questions ?? []).map((q) => q.id);
  const { data: variants } =
    qIds.length > 0
      ? await admin
          .from("question_variants")
          .select("*")
          .in("question_id", qIds)
      : { data: [] as Array<Record<string, unknown>> };

  return NextResponse.json({
    set: sets[0],
    questions: questions ?? [],
    variants: variants ?? [],
  });
}

/** Create a new question in the module's default set. */
export async function POST(req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  // Make sure there's a default set
  let { data: sets } = await admin
    .from("question_sets")
    .select("id")
    .eq("module_id", id)
    .limit(1);
  if (!sets || sets.length === 0) {
    const { data: created } = await admin
      .from("question_sets")
      .insert({ module_id: id, name: "Default" })
      .select("id");
    sets = created ?? [];
  }
  const setId = sets[0]?.id;
  if (!setId) {
    return NextResponse.json({ error: "no question set" }, { status: 500 });
  }

  // Determine next display_order
  const { data: lastQ } = await admin
    .from("questions")
    .select("display_order")
    .eq("question_set_id", setId)
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder = (lastQ?.[0]?.display_order ?? 0) + 1;

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!text || !key) {
    return NextResponse.json({ error: "text and key required" }, { status: 400 });
  }

  const { data: question, error: qErr } = await admin
    .from("questions")
    .insert({
      question_set_id: setId,
      key,
      display_order: nextOrder,
      type: (body.type as string) ?? "short_text",
      required: !!body.required,
      help_text: body.help_text ?? null,
      options: body.options ?? [],
      validation: body.validation ?? {},
      depends_on: body.depends_on ?? [],
      is_active: true,
    })
    .select()
    .single();

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  // Seed a single control variant so the question actually renders
  const { data: variant } = await admin
    .from("question_variants")
    .insert({
      question_id: question.id,
      label: "control",
      text,
      help_text: body.help_text ?? null,
      weight: 100,
      is_control: true,
    })
    .select()
    .single();

  return NextResponse.json({ question, variant });
}

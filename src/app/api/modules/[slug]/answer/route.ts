import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasConsent } from "@/lib/consent";
import { getModuleBySlug } from "@/lib/modules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Store an answer to a single question in the wizard flow. Keeps a row
 * per answer so we can compute per-question completion + variant wins.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    sessionId?: string;
    questionId?: string;
    variantId?: string | null;
    answer?: unknown;
    responseTimeMs?: number;
    skipped?: boolean;
  } | null;

  if (!body?.sessionId || !body.questionId) {
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

  const { error } = await admin.from("question_responses").insert({
    session_id: body.sessionId,
    question_id: body.questionId,
    variant_id: body.variantId ?? null,
    answer: body.answer ?? null,
    response_time_ms:
      typeof body.responseTimeMs === "number"
        ? Math.max(0, Math.round(body.responseTimeMs))
        : null,
    skipped: !!body.skipped,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

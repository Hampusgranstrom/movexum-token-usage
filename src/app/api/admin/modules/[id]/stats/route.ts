import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { analyzeAb } from "@/lib/ab-analysis";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });

  const [funnelRes, qStatsRes, qListRes] = await Promise.all([
    admin.rpc("get_module_funnel", { p_module_id: id, p_since: sinceStr }),
    admin.rpc("get_module_question_stats", { p_module_id: id, p_since: sinceStr }),
    admin
      .from("question_sets")
      .select("id, questions(id, key, display_order)")
      .eq("module_id", id),
  ]);

  // For each question, compute variant stats + Bayesian A/B
  const qIds: string[] = [];
  for (const s of qListRes.data ?? []) {
    type Q = { id: string };
    for (const q of (s.questions as Q[]) ?? []) qIds.push(q.id);
  }

  const abByQuestion: Record<
    string,
    Awaited<ReturnType<typeof analyzeAb>> & { question_id: string }[]
  > = {} as Record<string, Awaited<ReturnType<typeof analyzeAb>> & { question_id: string }[]>;

  const variantStats: Record<
    string,
    Array<{ id: string; label: string; shown: number; converted: number }>
  > = {};

  for (const qid of qIds) {
    const { data: rows } = await admin.rpc("get_question_variant_stats", {
      p_question_id: qid,
      p_since: sinceStr,
    });
    if (!rows || rows.length === 0) continue;

    // 'converted' in this context = answered (non-skipped)
    const stats = rows.map(
      (r: { variant_id: string; label: string; shown: number; answered: number }) => ({
        id: r.variant_id,
        label: r.label,
        shown: Number(r.shown ?? 0),
        converted: Number(r.answered ?? 0),
      }),
    );
    variantStats[qid] = stats;

    const controlId = rows.find(
      (r: { is_control: boolean; variant_id: string }) => r.is_control,
    )?.variant_id as string | undefined;

    const analyzed = analyzeAb(stats, { controlId: controlId ?? null });
    abByQuestion[qid] = analyzed as typeof abByQuestion[string];
  }

  return NextResponse.json({
    range_days: days,
    funnel: funnelRes.data?.[0] ?? {
      started: 0,
      completed: 0,
      abandoned: 0,
      completion_rate: 0,
    },
    questions: qStatsRes.data ?? [],
    variant_stats: variantStats,
    ab_analysis: abByQuestion,
  });
}

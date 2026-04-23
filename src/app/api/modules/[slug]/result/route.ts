import { NextResponse } from "next/server";
import { getModuleBySlug } from "@/lib/modules";
import { hasConsent } from "@/lib/consent";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Compute quiz result for a session: tallies option.scores across all
 * responses, returns the bucket with the highest score + module's
 * configured profile (title, description, tips, CTA).
 */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { sessionId?: string } | null;
  const sessionId = body?.sessionId;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const mod = await getModuleBySlug(slug);
  if (!mod) {
    return NextResponse.json({ error: "module not found" }, { status: 404 });
  }
  if (!(await hasConsent(mod.id, sessionId))) {
    return NextResponse.json({ error: "consent required" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  // Let the DB do the scoring — trust boundary and fast.
  const { data: rows, error } = await admin.rpc("score_session", {
    p_module_id: mod.id,
    p_session_id: sessionId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scores: Record<string, number> = {};
  for (const r of (rows ?? []) as Array<{ bucket_key: string; score: number }>) {
    scores[r.bucket_key] = Number(r.score);
  }

  const buckets = mod.result_buckets ?? [];
  if (buckets.length === 0) {
    return NextResponse.json({
      error: "module has no result buckets configured",
    }, { status: 500 });
  }

  // Pick bucket with highest score; ties go to the first in author order.
  let winner = buckets[0];
  let best = scores[winner.key] ?? 0;
  for (const b of buckets) {
    const s = scores[b.key] ?? 0;
    if (s > best) {
      winner = b;
      best = s;
    }
  }

  return NextResponse.json({
    bucket: winner,
    scores,
    all_buckets: buckets,
  });
}

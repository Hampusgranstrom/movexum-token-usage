import { NextResponse } from "next/server";
import { getModuleBySlug } from "@/lib/modules";
import { getQuestionsForSession } from "@/lib/questions";
import { getBrandSettings } from "@/lib/brand";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashIp, getClientIp, sha256 } from "@/lib/pii";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Public endpoint: fetch module config + resolved question list for a
 * given session id. Also records (idempotently) a module_session row so
 * we can compute funnel stats later.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const [mod, brand] = await Promise.all([
    getModuleBySlug(slug),
    getBrandSettings(),
  ]);
  if (!mod) {
    return NextResponse.json({ error: "module not found" }, { status: 404 });
  }

  const questions = await getQuestionsForSession(mod.id, sessionId);

  // Upsert module_session
  const admin = getSupabaseAdmin();
  if (admin) {
    const ip = getClientIp(req.headers);
    const ip_hash = await hashIp(ip);
    const ua = req.headers.get("user-agent") ?? "";
    const user_agent_hash = ua ? await sha256(`${ua}|mvx-v1`) : "";

    await admin
      .from("module_sessions")
      .upsert(
        {
          module_id: mod.id,
          session_id: sessionId,
          ip_hash,
          user_agent_hash,
          utm_source: url.searchParams.get("utm_source"),
          utm_medium: url.searchParams.get("utm_medium"),
          utm_campaign: url.searchParams.get("utm_campaign"),
          referer: req.headers.get("referer"),
          locale: req.headers.get("accept-language")?.slice(0, 5) ?? null,
        },
        { onConflict: "module_id,session_id", ignoreDuplicates: true },
      )
      .select();
  }

  // Never expose system_prompt to public — it could leak adversarial tricks
  // the AI should stay robust to.
  const publicMod = {
    id: mod.id,
    slug: mod.slug,
    name: mod.name,
    description: mod.description,
    flow_type: mod.flow_type,
    welcome_title: mod.welcome_title,
    welcome_body: mod.welcome_body,
    consent_text: mod.consent_text,
    consent_version: mod.consent_version,
    accent_color: mod.accent_color,
    hero_eyebrow: mod.hero_eyebrow,
    require_email: mod.require_email,
    require_phone: mod.require_phone,
  };

  return NextResponse.json({
    module: publicMod,
    brand,
    questions,
  });
}

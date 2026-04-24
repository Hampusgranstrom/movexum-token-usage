import { NextResponse } from "next/server";
import { getModuleBySlug } from "@/lib/modules";
import { recordConsent } from "@/lib/consent";
import { logAnalyticsEvent } from "@/lib/analytics";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    sessionId?: string;
  } | null;

  const sessionId = body?.sessionId;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const mod = await getModuleBySlug(slug);
  if (!mod) {
    return NextResponse.json({ error: "module not found" }, { status: 404 });
  }

  const ok = await recordConsent({
    moduleId: mod.id,
    sessionId,
    consentVersion: mod.consent_version,
    consentText: mod.consent_text,
    headers: req.headers,
  });

  if (!ok) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  await logAnalyticsEvent({
    eventType: "consent_given",
    metadata: {
      module_id: mod.id,
      module_slug: mod.slug,
      session_id: sessionId,
      consent_version: mod.consent_version,
    },
  });

  return NextResponse.json({ ok: true });
}

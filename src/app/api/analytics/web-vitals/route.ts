import { NextResponse } from "next/server";
import { logAnalyticsEvent } from "@/lib/analytics";

export const runtime = "nodejs";

type Body = {
  name?: "CLS" | "INP" | "LCP" | "FCP" | "TTFB";
  id?: string;
  value?: number;
  delta?: number;
  rating?: "good" | "needs-improvement" | "poor";
  navigationType?: string;
  path?: string;
};

function cleanPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return "/";
  return trimmed.slice(0, 300);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const validName = body?.name;
  if (!validName || !["CLS", "INP", "LCP", "FCP", "TTFB"].includes(validName)) {
    return NextResponse.json({ error: "invalid metric" }, { status: 400 });
  }

  const value = Number(body?.value);
  const delta = Number(body?.delta);
  if (!Number.isFinite(value) || !Number.isFinite(delta)) {
    return NextResponse.json({ error: "invalid metric values" }, { status: 400 });
  }

  await logAnalyticsEvent({
    eventType: "web_vital",
    metadata: {
      metric: validName,
      id: typeof body?.id === "string" ? body.id.slice(0, 120) : null,
      value,
      delta,
      rating: body?.rating ?? null,
      navigation_type: typeof body?.navigationType === "string" ? body.navigationType.slice(0, 60) : null,
      path: cleanPath(body?.path),
      collected_at: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}

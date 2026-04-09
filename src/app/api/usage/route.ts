import { NextResponse } from "next/server";
import { buildSummary } from "@/lib/aggregate";
import { generateMockUsage } from "@/lib/mock-data";
import { fetchOpenAiUsage } from "@/lib/openai-usage";
import type { GridKey } from "@/config/emissions";
import type { DailyUsage } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/usage?days=30&grid=global
 *
 * Hämtar senaste `days` dagarnas token-användning från OpenAI Usage API och
 * returnerar ett färdigt summary för dashboarden. Om OPENAI_ADMIN_KEY saknas
 * eller anropet misslyckas faller endpointen tillbaka på deterministisk
 * mockdata så att UI:t alltid kan renderas under utveckling.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = clampInt(searchParams.get("days"), 7, 90, 30);
  const grid: GridKey =
    searchParams.get("grid") === "sweden" ? "sweden" : "global";

  let current: DailyUsage[];
  let previous: DailyUsage[];
  let source: "live" | "mock" = "mock";

  if (process.env.OPENAI_ADMIN_KEY) {
    try {
      // Hämta 2*days så vi kan räkna ut delta mot föregående period
      const all = await fetchOpenAiUsage(days * 2);
      previous = all.slice(0, days);
      current = all.slice(days);
      source = "live";
    } catch (err) {
      console.error("[api/usage] falling back to mock:", err);
      const all = generateMockUsage(days * 2);
      previous = all.slice(0, days);
      current = all.slice(days);
    }
  } else {
    const all = generateMockUsage(days * 2);
    previous = all.slice(0, days);
    current = all.slice(days);
  }

  const summary = buildSummary(current, previous, grid, source);
  return NextResponse.json(summary);
}

function clampInt(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

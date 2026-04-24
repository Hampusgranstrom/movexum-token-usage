import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAnalysisSummary } from "@/lib/analysis-summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(request.url);
  const days = Math.min(180, Math.max(7, Number(searchParams.get("days")) || 30));

  try {
    const response = await getAnalysisSummary(days);

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=90",
      },
    });
  } catch (err) {
    console.error("[api/analysis] failed:", err);
    return NextResponse.json(
      { error: "Kunde inte hämta analysdata." },
      { status: 500 },
    );
  }
}

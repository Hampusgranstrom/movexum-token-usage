import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/dashboard-summary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(7, Number(searchParams.get("days")) || 30));

  try {
    const summary = await getDashboardSummary(days);

    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=90",
      },
    });
  } catch (err) {
    console.error("[api/dashboard] failed:", err);
    return NextResponse.json(
      { error: "Kunde inte ladda dashboard-data." },
      { status: 500 },
    );
  }
}

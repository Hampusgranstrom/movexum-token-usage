import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const url = new URL(req.url);
  const limit = Math.min(500, Number(url.searchParams.get("limit") ?? 100));

  const { data, error } = await admin
    .from("security_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}

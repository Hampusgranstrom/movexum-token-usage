import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_SOURCES } from "@/config/lead-sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ sources: DEFAULT_SOURCES });
  }

  const { data, error } = await admin
    .from("lead_sources")
    .select("id,label,icon,color,sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ sources: DEFAULT_SOURCES });
  }

  return NextResponse.json({
    sources: data?.length ? data : DEFAULT_SOURCES,
  });
}

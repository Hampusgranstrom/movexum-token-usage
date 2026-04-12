import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_SOURCES } from "@/config/lead-sources";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    // Fallback to hardcoded sources if Supabase is not configured
    return NextResponse.json(DEFAULT_SOURCES);
  }

  const { data, error } = await supabase
    .from("lead_sources")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[api/sources] query failed:", error.message);
    return NextResponse.json(DEFAULT_SOURCES);
  }

  return NextResponse.json(data);
}

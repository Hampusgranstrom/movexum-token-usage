import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Lead, LeadStatus, LeadListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set<string>([
  "new", "contacted", "meeting-booked", "evaluating", "accepted", "declined",
]);

const VALID_SORT_FIELDS = new Set(["created_at", "score", "name", "status"]);

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ej konfigurerad." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const status = searchParams.get("status") ?? "alla";
  const source = searchParams.get("source") ?? "";
  const search = searchParams.get("search") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "created_at";
  const sortDir = searchParams.get("sortDir") === "asc" ? true : false;

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" });

  if (status !== "alla" && VALID_STATUSES.has(status)) {
    query = query.eq("status", status);
  }
  if (source) {
    query = query.eq("source_id", source);
  }
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,idea_summary.ilike.%${search}%,organization.ilike.%${search}%`,
    );
  }

  const sortField = VALID_SORT_FIELDS.has(sortBy) ? sortBy : "created_at";
  query = query
    .order(sortField, { ascending: sortDir, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("[api/leads] query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response: LeadListResponse = {
    leads: (data ?? []) as Lead[],
    total: count ?? 0,
    page,
    pageSize,
  };

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ej konfigurerad." }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name as string | undefined;
  const sourceId = body.source_id as string | undefined;
  if (!name || !sourceId) {
    return NextResponse.json(
      { error: "name och source_id krävs." },
      { status: 400 },
    );
  }

  const insertData = {
    name,
    email: (body.email as string) ?? null,
    phone: (body.phone as string) ?? null,
    organization: (body.organization as string) ?? null,
    idea_summary: (body.idea_summary as string) ?? null,
    idea_category: (body.idea_category as string) ?? null,
    source_id: sourceId,
    source_detail: (body.source_detail as string) ?? null,
    status: ((body.status as string) ?? "new") as LeadStatus,
    notes: (body.notes as string) ?? null,
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[api/leads] insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log analytics event
  await supabase.from("analytics_events").insert({
    event_type: "lead_created",
    lead_id: data.id,
    metadata: { source: sourceId },
  });

  return NextResponse.json({ lead: data }, { status: 201 });
}

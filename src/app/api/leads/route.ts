import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_SOURCES } from "@/config/lead-sources";
import {
  VALID_SORT_FIELDS,
  VALID_STATUSES,
  sanitizeSearchTerm,
} from "@/lib/validation";
import type { Lead, LeadStatus, LeadListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_SOURCE_IDS = new Set<string>(DEFAULT_SOURCES.map((s) => s.id));

export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ej konfigurerad." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const status = searchParams.get("status") ?? "alla";
  const source = searchParams.get("source") ?? "";
  const rawSearch = searchParams.get("search") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "created_at";
  const sortDir = searchParams.get("sortDir") === "asc";

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" });

  if (status !== "alla" && VALID_STATUSES.has(status as LeadStatus)) {
    query = query.eq("status", status);
  }
  if (source && VALID_SOURCE_IDS.has(source)) {
    query = query.eq("source_id", source);
  }

  // Sanitised search term — prevents PostgREST filter-string injection via the
  // `.or(...)` chain (commas, parens and dots delimit filters and values).
  const search = sanitizeSearchTerm(rawSearch);
  if (search) {
    const pattern = `%${search}%`;
    query = query.or(
      [
        `name.ilike.${pattern}`,
        `email.ilike.${pattern}`,
        `municipality.ilike.${pattern}`,
        `idea_summary.ilike.${pattern}`,
        `organization.ilike.${pattern}`,
      ].join(","),
    );
  }

  const sortField = VALID_SORT_FIELDS.has(sortBy) ? sortBy : "created_at";
  query = query
    .order(sortField, { ascending: sortDir, nullsFirst: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("[api/leads] query failed:", error.message);
    return NextResponse.json(
      { error: "Kunde inte hämta leads." },
      { status: 500 },
    );
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
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const sourceId = typeof body.source_id === "string" ? body.source_id : "";
  if (!name) {
    return NextResponse.json({ error: "name krävs." }, { status: 400 });
  }
  if (!VALID_SOURCE_IDS.has(sourceId)) {
    return NextResponse.json({ error: "Ogiltig source_id." }, { status: 400 });
  }

  const statusRaw = typeof body.status === "string" ? body.status : "new";
  if (!VALID_STATUSES.has(statusRaw as LeadStatus)) {
    return NextResponse.json({ error: "Ogiltig status." }, { status: 400 });
  }

  const optionalString = (v: unknown, maxLen = 4000): string | null => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v !== "string") return null;
    return v.slice(0, maxLen);
  };

  const insertData = {
    name: name.slice(0, 200),
    email: optionalString(body.email, 254),
    phone: optionalString(body.phone, 40),
    municipality: optionalString(body.municipality, 120),
    organization: optionalString(body.organization, 200),
    idea_summary: optionalString(body.idea_summary),
    idea_category: optionalString(body.idea_category, 100),
    source_id: sourceId,
    source_detail: optionalString(body.source_detail),
    status: statusRaw as LeadStatus,
    notes: optionalString(body.notes),
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("[api/leads] insert failed:", error.message);
    return NextResponse.json(
      { error: "Kunde inte skapa lead." },
      { status: 500 },
    );
  }

  await supabase.from("analytics_events").insert({
    event_type: "lead_created",
    lead_id: data.id,
    metadata: { source: sourceId, created_by: guard.user.id },
  });

  return NextResponse.json({ lead: data }, { status: 201 });
}

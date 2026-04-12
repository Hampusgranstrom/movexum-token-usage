import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ej konfigurerad." }, { status: 500 });
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead hittades inte." }, { status: 404 });
  }

  // Also fetch conversations for this lead
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, created_at, extracted_data, total_input_tokens, total_output_tokens")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ lead: lead as Lead, conversations: conversations ?? [] });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
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

  // Only allow updating specific fields
  const allowedFields = [
    "name", "email", "phone", "organization",
    "idea_summary", "idea_category", "source_id", "source_detail",
    "status", "score", "score_reasoning", "assigned_to", "notes", "tags",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Inga giltiga fält att uppdatera." }, { status: 400 });
  }

  const oldStatus = body._oldStatus as string | undefined;

  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[api/leads/id] update failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log status change
  if (updates.status && oldStatus && updates.status !== oldStatus) {
    await supabase.from("analytics_events").insert({
      event_type: "status_changed",
      lead_id: id,
      metadata: { from: oldStatus, to: updates.status },
    });
  }

  return NextResponse.json({ lead: data as Lead });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ej konfigurerad." }, { status: 500 });
  }

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    console.error("[api/leads/id] delete failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

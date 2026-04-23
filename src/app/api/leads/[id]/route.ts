import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DEFAULT_SOURCES } from "@/config/lead-sources";
import { isValidUuid, sanitizeLeadPatch } from "@/lib/validation";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_SOURCE_IDS = new Set<string>(DEFAULT_SOURCES.map((s) => s.id));

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Ogiltigt id." }, { status: 400 });
  }

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

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, created_at, extracted_data, total_input_tokens, total_output_tokens")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ lead: lead as Lead, conversations: conversations ?? [] });
}

export async function PATCH(request: Request, context: RouteContext) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Ogiltigt id." }, { status: 400 });
  }

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

  const oldStatus =
    typeof body._oldStatus === "string" ? body._oldStatus : undefined;

  const result = sanitizeLeadPatch(body, VALID_SOURCE_IDS);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const updates = result.updates;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Inga giltiga fält att uppdatera." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[api/leads/id] update failed:", error.message);
    return NextResponse.json(
      { error: "Kunde inte uppdatera lead." },
      { status: 500 },
    );
  }

  if (updates.status && oldStatus && updates.status !== oldStatus) {
    await supabase.from("analytics_events").insert({
      event_type: "status_changed",
      lead_id: id,
      metadata: { from: oldStatus, to: updates.status, by: guard.user.id },
    });
  }

  return NextResponse.json({ lead: data as Lead });
}

// GDPR right-to-erasure endpoint. Superadmin-only because deletion is
// irreversible and cascades to messages via FK ON DELETE CASCADE.
export async function DELETE(_request: Request, context: RouteContext) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Ogiltigt id." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ej konfigurerad." }, { status: 500 });
  }

  // Audit-log the erasure before the row disappears.
  await supabase.from("analytics_events").insert({
    event_type: "lead_deleted",
    lead_id: id,
    metadata: { by: guard.user.id },
  });

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    console.error("[api/leads/id] delete failed:", error.message);
    return NextResponse.json(
      { error: "Kunde inte ta bort lead." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

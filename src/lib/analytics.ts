import { getSupabaseAdmin } from "./supabase";

export async function logAnalyticsEvent(params: {
  eventType: string;
  leadId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin.from("analytics_events").insert({
    event_type: params.eventType,
    lead_id: params.leadId ?? null,
    metadata: params.metadata ?? {},
  });
}

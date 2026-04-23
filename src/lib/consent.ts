import { getSupabaseAdmin } from "./supabase";
import { hashIp, getClientIp, sha256 } from "./pii";

/**
 * Persist a consent event for a module + session. Returns true on success.
 * Legal value: proves the user accepted a specific version of the text
 * at a specific time from a specific (hashed) IP / UA.
 */
export async function recordConsent(opts: {
  moduleId: string;
  sessionId: string;
  consentVersion: number;
  consentText: string;
  headers: Headers;
  leadId?: string | null;
}): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const ip = getClientIp(opts.headers);
  const ip_hash = await hashIp(ip);
  const ua = opts.headers.get("user-agent") ?? "";
  const user_agent_hash = ua ? await sha256(`${ua}|mvx-v1`) : "";

  const { error } = await admin.from("consent_events").insert({
    module_id: opts.moduleId,
    session_id: opts.sessionId,
    lead_id: opts.leadId ?? null,
    consent_version: opts.consentVersion,
    consent_text: opts.consentText,
    ip_hash,
    user_agent_hash,
  });

  return !error;
}

export async function hasConsent(
  moduleId: string,
  sessionId: string,
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const { data } = await admin
    .from("consent_events")
    .select("id")
    .eq("module_id", moduleId)
    .eq("session_id", sessionId)
    .limit(1);
  return !!data && data.length > 0;
}

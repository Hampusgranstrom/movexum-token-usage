import { getSupabaseAdmin } from "./supabase";
import { hashIp, getClientIp } from "./pii";

export type SecurityEventType =
  | "login"
  | "logout"
  | "invite_sent"
  | "invite_accepted"
  | "role_change"
  | "delete_user"
  | "delete_lead"
  | "export_lead"
  | "logo_upload"
  | "logo_remove"
  | "retention_run"
  | "module_create"
  | "module_update"
  | "module_delete"
  | "rate_limited"
  | "not_invited_login";

export async function logSecurityEvent(
  event: SecurityEventType,
  opts: {
    actorId?: string | null;
    actorEmail?: string | null;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
    headers?: Headers;
  } = {},
) {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const ip = opts.headers ? getClientIp(opts.headers) : null;
  const ip_hash = ip ? await hashIp(ip) : null;
  const user_agent = opts.headers?.get("user-agent") ?? null;

  await admin.from("security_events").insert({
    actor_id: opts.actorId ?? null,
    actor_email: opts.actorEmail ?? null,
    event_type: event,
    target_id: opts.targetId ?? null,
    metadata: opts.metadata ?? {},
    ip_hash,
    user_agent,
  });
}

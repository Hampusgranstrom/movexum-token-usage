import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { logSecurityEvent } from "@/lib/security-log";

export const runtime = "nodejs";

type RetentionConfig = {
  declinedMonths: number;
  inactiveMonths: number;
};

async function readRetentionConfig(): Promise<RetentionConfig> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { declinedMonths: 12, inactiveMonths: 24 };
  }

  const { data } = await admin
    .from("brand_settings")
    .select("key,value")
    .in("key", ["retention_declined_months", "retention_inactive_months"]);

  const map = Object.fromEntries(
    (data ?? []).map((r: { key: string; value: string | null }) => [r.key, r.value]),
  );

  const declinedMonths = Math.max(
    1,
    Number.parseInt(map.retention_declined_months ?? "12", 10) || 12,
  );
  const inactiveMonths = Math.max(
    1,
    Number.parseInt(map.retention_inactive_months ?? "24", 10) || 24,
  );

  return { declinedMonths, inactiveMonths };
}

export async function GET() {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const config = await readRetentionConfig();
  return NextResponse.json({ config });
}

export async function PATCH(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => null)) as {
    declinedMonths?: number;
    inactiveMonths?: number;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const declinedMonths = Math.max(1, Math.round(Number(body.declinedMonths ?? 12)));
  const inactiveMonths = Math.max(1, Math.round(Number(body.inactiveMonths ?? 24)));

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { error } = await admin.from("brand_settings").upsert(
    [
      {
        key: "retention_declined_months",
        value: String(declinedMonths),
        updated_by: guard.user.id,
      },
      {
        key: "retention_inactive_months",
        value: String(inactiveMonths),
        updated_by: guard.user.id,
      },
    ],
    { onConflict: "key" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logSecurityEvent("retention_run", {
    actorId: guard.user.id,
    actorEmail: guard.user.email,
    metadata: {
      action: "retention_config_updated",
      declined_months: declinedMonths,
      inactive_months: inactiveMonths,
    },
    headers: req.headers,
  });

  return NextResponse.json({ ok: true, config: { declinedMonths, inactiveMonths } });
}

/**
 * Runs the retention job (anonymizes leads outside the retention window).
 * Superadmin only. Safe to call repeatedly — the RPC is idempotent.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const configuredSecret = process.env.RETENTION_CRON_SECRET;
  const requestSecret =
    req.headers.get("x-retention-token") ?? url.searchParams.get("token");

  let actor: { id: string | null; email: string | null } = {
    id: null,
    email: "system@cron",
  };

  if (!configuredSecret || requestSecret !== configuredSecret) {
    const guard = await requireRole("superadmin");
    if ("error" in guard) return guard.error;
    actor = { id: guard.user.id, email: guard.user.email };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { data, error } = await admin.rpc("run_retention");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const anonymizedCount =
    (Array.isArray(data) && data[0]?.anonymized_count) ?? 0;

  await logSecurityEvent("retention_run", {
    actorId: actor.id,
    actorEmail: actor.email,
    metadata: { anonymized_count: Number(anonymizedCount) },
    headers: req.headers,
  });

  return NextResponse.json({ ok: true, anonymized: Number(anonymizedCount) });
}

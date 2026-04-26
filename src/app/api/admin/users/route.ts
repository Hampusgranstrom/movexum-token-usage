import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAdminOrigin } from "@/lib/domain";
import { logSecurityEvent } from "@/lib/security-log";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  const { data: rows, error } = await admin
    .from("app_users")
    .select("id, email, role, created_at, invited_by")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with last_sign_in_at from auth.users (available via admin API).
  const ids = (rows ?? []).map((r) => r.id);
  const signIns = new Map<string, string | null>();
  if (ids.length > 0) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    for (const u of list?.users ?? []) {
      if (ids.includes(u.id)) {
        signIns.set(u.id, u.last_sign_in_at ?? null);
      }
    }
  }

  const users = (rows ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    created_at: r.created_at,
    invited_by: r.invited_by,
    last_sign_in_at: signIns.get(r.id) ?? null,
  }));

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const body = (await req.json().catch(() => null)) as
    | { email?: string; role?: "admin" | "superadmin" }
    | null;

  const email = body?.email?.trim().toLowerCase();
  const role = body?.role === "superadmin" ? "superadmin" : "admin";

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  // For invite flow, always redirect to admin surface to ensure user lands on password setup page.
  // getAdminOrigin returns the explicit admin domain if ADMIN_HOST is set, otherwise falls back.
  const adminOrigin = getAdminOrigin(req);
  const redirectTo = `${adminOrigin}/accept-invite`;

  const promoteIfNeeded = async (idOrEmail: { id?: string | null; email: string }) => {
    if (role !== "superadmin") return;
    if (idOrEmail.id) {
      await admin
        .from("app_users")
        .update({ role: "superadmin" })
        .eq("id", idOrEmail.id);
      return;
    }

    await admin
      .from("app_users")
      .update({ role: "superadmin" })
      .eq("email", idOrEmail.email);
  };

  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { role, invited_by: guard.user.id },
      redirectTo,
    },
  );

  // Always generate a manual backup link. This protects operations when
  // SMTP is misconfigured or when delivery silently fails after accepted API call.
  const fallback = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { role, invited_by: guard.user.id },
      redirectTo,
    },
  });

  const inviteUrl = fallback.data?.properties?.action_link ?? null;
  const fallbackFailed = !!(fallback.error || !inviteUrl);

  if (error) {
    if (fallbackFailed) {
      await logSecurityEvent("invite_sent", {
        actorId: guard.user.id,
        actorEmail: guard.user.email,
        targetId: fallback.data?.user?.id ?? null,
        metadata: {
          email,
          role,
          email_sent: false,
          invite_api_error: error.message,
          fallback_generated: false,
          fallback_error: fallback.error?.message ?? null,
          redirect_to: redirectTo,
        },
        headers: req.headers,
      });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await promoteIfNeeded({ id: fallback.data?.user?.id ?? null, email });
    await logSecurityEvent("invite_sent", {
      actorId: guard.user.id,
      actorEmail: guard.user.email,
      targetId: fallback.data?.user?.id ?? null,
      metadata: {
        email,
        role,
        email_sent: false,
        invite_api_error: error.message,
        fallback_generated: true,
        redirect_to: fallback.data?.properties?.redirect_to ?? redirectTo,
      },
      headers: req.headers,
    });

    return NextResponse.json({
      ok: true,
      user_id: fallback.data?.user?.id ?? null,
      email_sent: false,
      invite_url: inviteUrl,
      warning:
        "Inbjudningsmail kunde inte skickas automatiskt. Dela reservlänken manuellt.",
      redirect_to: fallback.data?.properties?.redirect_to ?? redirectTo,
    });
  }

  // Trigger on auth.users creates the app_users row with default 'admin'.
  // If the superadmin requested a superadmin invite, upgrade it here.
  await promoteIfNeeded({ id: data.user?.id ?? null, email });

  await logSecurityEvent("invite_sent", {
    actorId: guard.user.id,
    actorEmail: guard.user.email,
    targetId: data.user?.id ?? null,
    metadata: {
      email,
      role,
      email_sent: true,
      fallback_generated: !fallbackFailed,
      redirect_to: redirectTo,
    },
    headers: req.headers,
  });

  return NextResponse.json({
    ok: true,
    user_id: data.user?.id ?? null,
    email_sent: true,
    invite_url: fallbackFailed ? null : inviteUrl,
    warning: fallbackFailed
      ? "Inbjudningsmail initierat. Reservlänk kunde inte skapas i detta försök."
      : "Inbjudningsmail initierat. Reservlänk är tillgänglig om mailet inte levereras.",
    redirect_to: redirectTo,
  });
}

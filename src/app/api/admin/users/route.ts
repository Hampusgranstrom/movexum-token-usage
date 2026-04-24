import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAdminOrigin } from "@/lib/domain";

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

  const origin = getAdminOrigin(req);

  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { role, invited_by: guard.user.id },
      redirectTo: `${origin}/accept-invite`,
    },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Trigger on auth.users creates the app_users row with default 'admin'.
  // If the superadmin requested a superadmin invite, upgrade it here.
  if (role === "superadmin") {
    if (data.user?.id) {
      await admin
        .from("app_users")
        .update({ role: "superadmin" })
        .eq("id", data.user.id);
    } else {
      await admin
        .from("app_users")
        .update({ role: "superadmin" })
        .eq("email", email);
    }
  }

  return NextResponse.json({
    ok: true,
    user_id: data.user?.id ?? null,
    email_sent: true,
    redirect_to: `${origin}/accept-invite`,
  });
}

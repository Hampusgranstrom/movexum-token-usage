import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function countSuperadmins(admin: ReturnType<typeof getSupabaseAdmin>) {
  if (!admin) return 0;
  const { count } = await admin
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "superadmin");
  return count ?? 0;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { role?: "admin" | "superadmin" }
    | null;

  const role = body?.role;
  if (role !== "admin" && role !== "superadmin") {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  // Prevent removing the last superadmin.
  if (id === guard.user.id && role === "admin") {
    const n = await countSuperadmins(admin);
    if (n <= 1) {
      return NextResponse.json(
        { error: "Kan inte degradera sista superadmin" },
        { status: 400 },
      );
    }
  }

  const { error } = await admin
    .from("app_users")
    .update({ role })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const guard = await requireRole("superadmin");
  if ("error" in guard) return guard.error;

  const { id } = await ctx.params;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "supabase unavailable" }, { status: 500 });
  }

  // Prevent removing the last superadmin (or self if alone).
  const { data: target } = await admin
    .from("app_users")
    .select("role")
    .eq("id", id)
    .maybeSingle();

  if (target?.role === "superadmin") {
    const n = await countSuperadmins(admin);
    if (n <= 1) {
      return NextResponse.json(
        { error: "Kan inte ta bort sista superadmin" },
        { status: 400 },
      );
    }
  }

  // Removing from auth.users cascades to app_users via FK.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

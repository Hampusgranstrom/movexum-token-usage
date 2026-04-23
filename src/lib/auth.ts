import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "./supabase";

export type AppRole = "admin" | "superadmin";

export type CurrentUser = {
  id: string;
  email: string;
  role: AppRole;
};

/**
 * Reads the signed-in user from the request cookies and looks up their
 * role in public.app_users. Returns null if not signed in, or if the user
 * has no app_users row (i.e. not invited).
 *
 * Server-only — uses service_role to bypass RLS when reading the role.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* read-only in server components */
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || !user.email) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: row } = await admin
    .from("app_users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!row) return null;

  return {
    id: user.id,
    email: user.email,
    role: row.role as AppRole,
  };
}

/**
 * Guard for admin-API routes. Returns the current user if they have (at
 * least) the required role, otherwise returns a Response object that the
 * route should return directly.
 */
export async function requireRole(
  required: AppRole,
): Promise<{ user: CurrentUser } | { error: Response }> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  const rank = (r: AppRole) => (r === "superadmin" ? 2 : 1);
  if (rank(user.role) < rank(required)) {
    return {
      error: new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }

  return { user };
}

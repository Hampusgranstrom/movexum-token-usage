import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware that protects admin routes (dashboard, leads, /admin, /api/*)
 * behind Supabase Auth + the app_users role table. /chat and /api/chat stay
 * public so the AI intake can be used anonymously.
 *
 * Each admin API route also enforces requireRole() itself as defence in
 * depth — don't rely solely on this middleware for authorization.
 */

const PUBLIC_PAGE_PATHS = new Set(["/chat", "/login", "/accept-invite"]);
const PUBLIC_API_PATHS = new Set(["/api/chat"]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PAGE_PATHS.has(pathname)) return true;
  if (PUBLIC_API_PATHS.has(pathname)) return true;
  // /accept-invite may carry fragments/queries but nothing nested.
  for (const p of PUBLIC_PAGE_PATHS) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return true;
  }
  return false;
}

function unauthorized(request: NextRequest, reason?: string) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: reason ?? "unauthorized" },
      { status: 401 },
    );
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  if (reason) loginUrl.searchParams.set("error", reason);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized(request);
  }

  // Role lookup via service_role (bypasses RLS). If no row → not invited.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceUrl = process.env.SUPABASE_URL ?? supabaseUrl;
  let role: "admin" | "superadmin" | null = null;

  if (serviceKey) {
    const admin = createClient(serviceUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: row } = await admin
      .from("app_users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = (row?.role as "admin" | "superadmin" | undefined) ?? null;
  }

  if (!role) {
    await supabase.auth.signOut();
    return unauthorized(request, "not_invited");
  }

  if (pathname.startsWith("/admin") && role !== "superadmin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  // Skip Next internals, favicon, and static image assets — they don't need
  // auth and we don't want to pay the cookie-parse cost on every tile.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};

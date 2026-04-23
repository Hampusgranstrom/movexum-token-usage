import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "./lib/rate-limit";

/**
 * Middleware protects admin routes behind Supabase Auth + role,
 * rate-limits hot endpoints and attaches security headers to every
 * response.
 */

const PUBLIC_PATHS = [
  "/login",
  "/accept-invite",
  "/chat",               // legacy, redirected at page level
  "/m/",                 // any /m/<slug>
  "/api/chat",
  "/api/sources",
  "/api/health",
  "/api/modules/",       // public module endpoints (prefix match)
];

const RATE_LIMITS: Array<{ prefix: string; limit: number; windowMs: number }> = [
  { prefix: "/api/chat",                      limit: 20, windowMs: 60_000 },
  { prefix: "/api/modules/",                  limit: 60, windowMs: 60_000 },
  { prefix: "/api/admin/users",               limit: 10, windowMs: 60_000 },
  { prefix: "/api/admin/brand",               limit: 10, windowMs: 60_000 },
];

function securityHeaders(res: NextResponse) {
  // Content-Security-Policy: self + Supabase (for API + storage) + Anthropic.
  // Google Fonts are served via next/font and bundled, so no font-src needed.
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "img-src 'self' data: https: blob:",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  );
}

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Short-circuit static + Next internals: no auth, no rate limit, no headers needed.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Rate limit early for abusive endpoints
  const rl = RATE_LIMITS.find((r) => pathname.startsWith(r.prefix));
  if (rl) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const result = rateLimit(`${ip}:${rl.prefix}`, {
      limit: rl.limit,
      windowMs: rl.windowMs,
    });
    if (!result.ok) {
      const res = new NextResponse(
        JSON.stringify({ error: "rate_limited", retryAfterMs: result.retryAfterMs }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
      res.headers.set(
        "Retry-After",
        Math.ceil(result.retryAfterMs / 1000).toString(),
      );
      securityHeaders(res);
      return res;
    }
  }

  // Public routes: just attach security headers and pass through.
  if (isPublic(pathname)) {
    const res = NextResponse.next();
    securityHeaders(res);
    return res;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    const res = NextResponse.next();
    securityHeaders(res);
    return res;
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "unauthorized" }, { status: 401 });
      securityHeaders(res);
      return res;
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const res = NextResponse.redirect(loginUrl);
    securityHeaders(res);
    return res;
  }

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
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "not_invited" }, { status: 401 });
      securityHeaders(res);
      return res;
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "not_invited");
    const res = NextResponse.redirect(loginUrl);
    securityHeaders(res);
    return res;
  }

  if (pathname.startsWith("/admin") && role !== "superadmin") {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "forbidden" }, { status: 403 });
      securityHeaders(res);
      return res;
    }
    const res = NextResponse.redirect(new URL("/", request.url));
    securityHeaders(res);
    return res;
  }

  response.headers.set("x-user-role", role);
  securityHeaders(response);
  return response;
}

export const config = {
  // Skip Next internals, favicon, and static image assets — they don't need
  // auth and we don't want to pay the cookie-parse cost on every tile.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};

/**
 * Domain-aware surface split. In production we run two hostnames:
 *   PUBLIC_HOST  (e.g. startupkompassen.se)       — public intake
 *   ADMIN_HOST   (e.g. admin.startupkompassen.se) — team-only admin
 *
 * Both env vars are optional. If either is missing we fall into
 * "combined" mode (useful for localhost / preview) where every route
 * is served from the current host.
 */

export type Surface = "admin" | "public" | "combined";

export function getSurface(host: string | null | undefined): Surface {
  const adminHost = process.env.ADMIN_HOST?.toLowerCase() || null;
  const publicHost = process.env.PUBLIC_HOST?.toLowerCase() || null;
  if (!adminHost || !publicHost) return "combined";
  const h = (host ?? "").toLowerCase().split(":")[0];
  if (h === adminHost) return "admin";
  if (h === publicHost) return "public";
  // Unknown host (e.g. preview URL) falls back to combined.
  return "combined";
}

export function getAdminOrigin(req: Request): string {
  const adminHost = process.env.ADMIN_HOST;
  const publicHost = process.env.PUBLIC_HOST;

  // If explicit admin host is set, use it.
  if (adminHost) {
    const proto = adminHost === "localhost" ? "http" : "https";
    return `${proto}://${adminHost}`;
  }

  // In combined mode (no split hosts), use public host for admin routes too.
  if (publicHost) {
    const proto = publicHost === "localhost" ? "http" : "https";
    return `${proto}://${publicHost}`;
  }

  // Last resort: derive from incoming request.
  const reqOrigin = new URL(req.url).origin;
  if (reqOrigin.includes("localhost") || reqOrigin.includes("127.0.0.1")) {
    console.warn(
      "[getAdminOrigin] Falling back to localhost — set ADMIN_HOST or PUBLIC_HOST env var"
    );
  }
  return reqOrigin;
}

export function getPublicOrigin(req: Request): string {
  const publicHost = process.env.PUBLIC_HOST;
  if (publicHost) {
    const proto = publicHost === "localhost" ? "http" : "https";
    return `${proto}://${publicHost}`;
  }
  // Fallback to request origin in combined mode.
  return new URL(req.url).origin;
}

/**
 * Routes that are *only* valid on the admin surface. The middleware
 * redirects these to ADMIN_HOST if hit on the public surface.
 */
export function isAdminRoute(path: string): boolean {
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/analysis") ||
    path.startsWith("/admin") ||
    path.startsWith("/leads") ||
    path.startsWith("/login") ||
    path.startsWith("/accept-invite") ||
    path.startsWith("/api/admin") ||
    path.startsWith("/api/leads") ||
    path.startsWith("/api/dashboard") ||
    path.startsWith("/api/analysis")
  );
}

/**
 * Routes that are *only* valid on the public surface. Redirected to
 * PUBLIC_HOST if hit on the admin surface.
 */
export function isPublicRoute(path: string): boolean {
  return (
    path === "/" ||
    path.startsWith("/m/") ||
    path === "/chat" ||
    path.startsWith("/api/modules") ||
    path.startsWith("/api/chat") ||
    path.startsWith("/api/sources")
  );
}

/** Routes available on both surfaces. */
export function isSharedRoute(path: string): boolean {
  return path === "/api/health";
}

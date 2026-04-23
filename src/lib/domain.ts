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
  if (adminHost) {
    const proto = adminHost === "localhost" ? "http" : "https";
    return `${proto}://${adminHost}`;
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return new URL(req.url).origin;
}

export function getPublicOrigin(req: Request): string {
  const publicHost = process.env.PUBLIC_HOST;
  if (publicHost) {
    const proto = publicHost === "localhost" ? "http" : "https";
    return `${proto}://${publicHost}`;
  }
  return new URL(req.url).origin;
}

/**
 * Routes that are *only* valid on the admin surface. The middleware
 * redirects these to ADMIN_HOST if hit on the public surface.
 */
export function isAdminRoute(path: string): boolean {
  if (path === "/") return true;
  return (
    path.startsWith("/admin") ||
    path.startsWith("/leads") ||
    path.startsWith("/login") ||
    path.startsWith("/accept-invite") ||
    path.startsWith("/api/admin") ||
    path.startsWith("/api/leads") ||
    path.startsWith("/api/dashboard")
  );
}

/**
 * Routes that are *only* valid on the public surface. Redirected to
 * PUBLIC_HOST if hit on the admin surface.
 */
export function isPublicRoute(path: string): boolean {
  return (
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

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Good enough for single-instance deployments (Vercel serverless functions
 * behind a single region) to push back casual abuse of /api/chat. For a
 * multi-region setup this should be replaced with a Redis / Upstash-backed
 * limiter — the interface here is designed to swap in place.
 */

type Entry = { windowStart: number; count: number };

const buckets = new Map<string, Entry>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetMs: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    buckets.set(key, { windowStart: now, count: 1 });
    return { ok: true, remaining: limit - 1, resetMs: windowMs };
  }

  entry.count += 1;
  const resetMs = windowMs - (now - entry.windowStart);

  if (entry.count > limit) {
    return { ok: false, remaining: 0, resetMs };
  }

  return { ok: true, remaining: Math.max(0, limit - entry.count), resetMs };
}

// Opportunistic cleanup to stop the map growing unbounded under long uptime.
// Runs on 1-in-50 requests.
export function maybeReap(windowMs: number) {
  if (Math.random() > 0.02) return;
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (now - v.windowStart >= windowMs) buckets.delete(k);
  }
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

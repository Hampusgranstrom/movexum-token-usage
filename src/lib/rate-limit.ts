/**
 * Simple in-memory sliding-window rate limiter. Good enough for a single
 * Node process. For multi-instance production, swap `bucket` for Upstash
 * Redis — the public interface stays the same.
 */

type Bucket = { hits: number; resetAt: number };
const bucket = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterMs: number };

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const entry = bucket.get(key);

  if (!entry || entry.resetAt < now) {
    bucket.set(key, { hits: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }

  if (entry.hits >= opts.limit) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }

  entry.hits += 1;
  return { ok: true };
}

/** Periodically drop expired buckets so memory stays bounded. */
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { __rateLimitGcRegistered?: boolean };
  if (!g.__rateLimitGcRegistered) {
    g.__rateLimitGcRegistered = true;
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of bucket) if (v.resetAt < now) bucket.delete(k);
    }, 60_000).unref?.();
  }
}

/**
 * PII redaction helpers. Use before logging, returning errors to user,
 * or sending anything to external telemetry. Keep client- and server-safe.
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;
const SWE_PERSONNR_RE = /\b\d{6,8}[- ]?\d{4}\b/g;

export function redactPII(input: string): string {
  if (!input) return input;
  return input
    .replace(EMAIL_RE, "[email]")
    .replace(SWE_PERSONNR_RE, "[personnr]")
    .replace(PHONE_RE, "[phone]");
}

/**
 * sha256 hex, useful for hashing IPs / UAs for anonymous dedup + analytics.
 * Returns empty string if Web Crypto isn't available.
 */
export async function sha256(input: string): Promise<string> {
  if (!input) return "";
  const g = globalThis as unknown as { crypto?: Crypto };
  if (!g.crypto?.subtle) return "";
  const data = new TextEncoder().encode(input);
  const buf = await g.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash IP + daily salt so we can count unique hits without storing raw IPs.
 * The salt rotates daily, which thwarts long-term user re-identification.
 */
export async function hashIp(ip: string | null | undefined): Promise<string> {
  if (!ip) return "";
  const day = new Date().toISOString().slice(0, 10);
  return sha256(`${ip}|${day}|movexum-v1`);
}

export function getClientIp(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    null
  );
}

/**
 * Deterministic A/B variant assignment. Same (session, question) always
 * resolves to the same variant for a given set of variants + weights —
 * so a user who reloads mid-flow keeps their variant.
 */

export type VariantInput = {
  id: string;
  weight: number; // 0..100
};

const ASSIGNMENT_SALT = "mvx-ab-v1";

async function hashToUnit(input: string): Promise<number> {
  const g = globalThis as unknown as { crypto?: Crypto };
  if (!g.crypto?.subtle) {
    // Fallback: simple 32-bit FNV-1a
    let h = 2166136261 >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h / 0xffffffff;
  }
  const buf = await g.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const view = new DataView(buf);
  // Use first 32 bits as unsigned int in [0,1).
  return view.getUint32(0) / 0x100000000;
}

export async function assignVariant<T extends VariantInput>(
  sessionId: string,
  questionId: string,
  variants: T[],
): Promise<T | null> {
  if (variants.length === 0) return null;
  const total = variants.reduce((s, v) => s + Math.max(0, v.weight), 0);
  if (total <= 0) return variants[0] ?? null;

  const r = await hashToUnit(`${sessionId}:${questionId}:${ASSIGNMENT_SALT}`);
  const target = r * total;

  let cumulative = 0;
  for (const v of variants) {
    cumulative += Math.max(0, v.weight);
    if (target < cumulative) return v;
  }
  return variants[variants.length - 1];
}

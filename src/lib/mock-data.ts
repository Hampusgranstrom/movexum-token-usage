import type { DailyUsage } from "./types";

/**
 * Deterministisk pseudo-slumpgenerator (mulberry32) så mockdatan ser likadan ut
 * varje render. Inte krypto-säker, men det behövs inte här.
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Genererar realistisk-looking mockdata för de senaste `days` dagarna.
 *
 * Beteende:
 *  - Tokens ligger på ungefär 1,5–3M per dag
 *  - Lägre användning på helger
 *  - Liten uppåtgående trend
 *  - Ett par toppdagar
 */
export function generateMockUsage(days = 30): DailyUsage[] {
  const rand = mulberry32(42);
  const out: DailyUsage[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const weekday = d.getUTCDay(); // 0 = söndag, 6 = lördag
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.35 : 1;

    // Baslinje med lätt uppåtgående trend
    const trend = 1 + (days - i) * 0.008;
    const base = 1_800_000 * trend * weekendFactor;

    // Slumpmässig variation ±25%
    const jitter = 0.75 + rand() * 0.5;

    // Någon enstaka toppdag
    const spike = rand() > 0.93 ? 1.8 : 1;

    const total = Math.round(base * jitter * spike);
    // Ca 70% input / 30% output är ett typiskt mönster för chat-applikationer
    const inputTokens = Math.round(total * 0.7);
    const outputTokens = total - inputTokens;

    out.push({
      date: d.toISOString().slice(0, 10),
      inputTokens,
      outputTokens,
      totalTokens: total,
    });
  }

  return out;
}

/**
 * Koefficienter för att omvandla tokens till energi (kWh) och utsläpp (kg CO₂e).
 *
 * Källa (energi): Sam Altman, "The Gentle Singularity" (juni 2025).
 *   En genomsnittlig ChatGPT-query ≈ 0,34 Wh.
 *
 * Källa (grid): IEA globalt genomsnitt samt Energimyndigheten för Sverige.
 *
 * När OpenAI publicerar en officiell siffra per token byter vi direkt till den.
 */
export const EMISSIONS = {
  /** Energi per genomsnittlig ChatGPT-query (Wh). */
  WH_PER_QUERY: 0.34,

  /** Antagen genomsnittlig query ≈ 500 tokens (input + output). */
  AVG_TOKENS_PER_QUERY: 500,

  /** Carbon intensity i gram CO₂e per kWh. */
  GRID_G_PER_KWH: {
    global: 475,
    sweden: 40,
  },
} as const;

export type GridKey = keyof typeof EMISSIONS.GRID_G_PER_KWH;

/** Beräknat: kWh per token. */
export const KWH_PER_TOKEN =
  EMISSIONS.WH_PER_QUERY / EMISSIONS.AVG_TOKENS_PER_QUERY / 1000;

/** Räkna om ett antal tokens till kWh. */
export function tokensToKwh(tokens: number): number {
  return tokens * KWH_PER_TOKEN;
}

/** Räkna om kWh till kg CO₂e för valt elnät. */
export function kwhToCo2Kg(kwh: number, grid: GridKey = "global"): number {
  const gPerKwh = EMISSIONS.GRID_G_PER_KWH[grid];
  return (kwh * gPerKwh) / 1000;
}

/** Räkna om tokens direkt till kg CO₂e. */
export function tokensToCo2Kg(tokens: number, grid: GridKey = "global"): number {
  return kwhToCo2Kg(tokensToKwh(tokens), grid);
}

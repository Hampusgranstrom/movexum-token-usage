import { tokensToCo2Kg, tokensToKwh, type GridKey } from "@/config/emissions";
import type { DailyUsage, DataSource, UsageSummary } from "./types";

/**
 * Tar rå daglig usage och returnerar ett färdigt summary-objekt som frontend
 * kan rendera rakt av. Beräknar totalsiffror, kWh, CO₂ och delta mot en lika
 * lång föregående period.
 */
export function buildSummary(
  currentDays: DailyUsage[],
  previousDays: DailyUsage[],
  grid: GridKey,
  source: DataSource,
): UsageSummary {
  const totals = sumDays(currentDays);
  const prev = sumDays(previousDays);

  const kwh = tokensToKwh(totals.tokens);
  const co2Kg = tokensToCo2Kg(totals.tokens, grid);
  const prevKwh = tokensToKwh(prev.tokens);
  const prevCo2Kg = tokensToCo2Kg(prev.tokens, grid);

  return {
    days: currentDays,
    totals: {
      tokens: totals.tokens,
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      kwh,
      co2Kg,
    },
    deltas: {
      tokens: pctDelta(totals.tokens, prev.tokens),
      kwh: pctDelta(kwh, prevKwh),
      co2Kg: pctDelta(co2Kg, prevCo2Kg),
    },
    source,
    grid,
  };
}

function sumDays(days: DailyUsage[]) {
  let tokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const d of days) {
    tokens += d.totalTokens;
    inputTokens += d.inputTokens;
    outputTokens += d.outputTokens;
  }
  return { tokens, inputTokens, outputTokens };
}

/** Returnerar en decimaldel, t.ex. 0.12 för +12%. 0 om föregående var 0. */
function pctDelta(current: number, previous: number): number {
  if (previous === 0) return 0;
  return (current - previous) / previous;
}

export type DailyUsage = {
  /** ISO-datum, t.ex. "2026-04-08". */
  date: string;
  inputTokens: number;
  outputTokens: number;
  /** Summan input + output. */
  totalTokens: number;
};

export type UsageSummary = {
  days: DailyUsage[];
  totals: {
    tokens: number;
    inputTokens: number;
    outputTokens: number;
    kwh: number;
    co2Kg: number;
  };
  /** Jämfört med föregående period av samma längd. */
  deltas: {
    tokens: number;
    kwh: number;
    co2Kg: number;
  };
  /** Var datan kom ifrån. */
  source: DataSource;
  /** Vilket elnät som användes vid CO₂-beräkningen. */
  grid: "global" | "sweden";
};

/**
 * Var dashboarden hämtade sin data.
 *  - "supabase"      = aggregat från token_usage_daily (primär path)
 *  - "openai-live"   = direkt fallback mot OpenAI Usage API
 */
export type DataSource = "supabase" | "openai-live";

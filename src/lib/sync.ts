import { tokensToCo2Kg, tokensToKwh } from "@/config/emissions";
import { fetchOpenAiUsageBuckets } from "./openai-usage";
import { getSupabaseAdmin } from "./supabase";

export type SyncResult = {
  status: "ok";
  rowsUpserted: number;
  daysCovered: number;
  source: "openai-usage-api";
  finishedAt: string;
};

/**
 * Hämtar senaste `days` dagarnas användning från OpenAI och upsertar in den
 * i `token_usage_daily`. Beräknade fält (energy_kwh, co2_kg_*) skrivs också in
 * så att dashboarden kan läsa direkt utan att räkna om.
 */
export async function runSync(days = 35): Promise<SyncResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const buckets = await fetchOpenAiUsageBuckets(days);

  const rows = buckets.map((b) => {
    const total = b.inputTokens + b.outputTokens;
    return {
      day: b.day,
      project_id: b.projectId || "",
      model: b.model || "",
      input_tokens: b.inputTokens,
      output_tokens: b.outputTokens,
      // total_tokens är en generated column — inte med i insert
      energy_kwh: tokensToKwh(total),
      co2_kg_global: tokensToCo2Kg(total, "global"),
      co2_kg_sweden: tokensToCo2Kg(total, "sweden"),
      source: "openai-usage-api",
    };
  });

  // Upsert i bitar om listan blir lång (Supabase rekommenderar < 1000 rader/call)
  const chunkSize = 500;
  let rowsUpserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error, count } = await supabase
      .from("token_usage_daily")
      .upsert(chunk, {
        onConflict: "day,project_id,model",
        count: "exact",
      });
    if (error) {
      throw new Error(
        `Supabase upsert failed at chunk ${i / chunkSize}: ${error.message}`,
      );
    }
    rowsUpserted += count ?? chunk.length;
  }

  const daysCovered = new Set(rows.map((r) => r.day)).size;

  return {
    status: "ok",
    rowsUpserted,
    daysCovered,
    source: "openai-usage-api",
    finishedAt: new Date().toISOString(),
  };
}

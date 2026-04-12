/**
 * AI-powered lead scoring.
 *
 * Evaluates an extracted lead profile and returns a score (0-100)
 * with a short reasoning string.
 */

import { createChatCompletion } from "./anthropic-chat";
import type { ExtractedLeadData } from "./types";

const SCORING_PROMPT = `Du är en bedömningsassistent för Movexums inkubator. Poängsätt denna lead på en skala 0-100 baserat på:

1. Idéns tydlighet och problemlösning (0-25p)
2. Marknadspotential (0-25p)
3. Grundarens beredskap och engagemang (0-25p)
4. Passform med Movexums inkubator (0-25p)

Returnera ENBART ett JSON-objekt (ingen markdown):
{
  "score": <nummer 0-100>,
  "reasoning": "<kort motivering på svenska, max 2 meningar>"
}`;

export async function scoreLead(
  data: ExtractedLeadData,
): Promise<{ score: number; reasoning: string }> {
  try {
    const userMessage = `Lead-data:\n${JSON.stringify(data, null, 2)}`;

    const result = await createChatCompletion(
      SCORING_PROMPT,
      [{ role: "user", content: userMessage }],
      { temperature: 0.2, maxTokens: 256 },
    );

    const text = result.message.content.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { score: 50, reasoning: "Kunde inte bedöma." };

    const parsed = JSON.parse(jsonMatch[0]) as {
      score?: number;
      reasoning?: string;
    };

    return {
      score: Math.min(100, Math.max(0, Math.round(parsed.score ?? 50))),
      reasoning: parsed.reasoning ?? "Ingen motivering.",
    };
  } catch (err) {
    console.error("[lead-scoring] Scoring failed:", err);
    return { score: 50, reasoning: "Bedömning kunde inte genomföras." };
  }
}

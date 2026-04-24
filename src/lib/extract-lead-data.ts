/**
 * Extracts structured lead data from a conversation using Claude.
 *
 * Makes a secondary API call with a focused extraction prompt.
 * Returns partial data — fields are only set when the AI finds them.
 */

import { createChatCompletion, type ChatMessage } from "./anthropic-chat";
import type { ExtractedLeadData } from "./types";

const EXTRACTION_PROMPT = `Du är en dataextraktionsassistent. Analysera konversationen nedan och extrahera all kontaktinformation och idédetaljer som nämnts.

Returnera ENBART ett JSON-objekt (ingen markdown, ingen förklaring) med dessa fält. Utelämna fält som inte nämnts:

{
  "name": "personens namn",
  "email": "e-postadress",
  "phone": "telefonnummer",
  "municipality": "kommun där personen verkar",
  "organization": "företag eller organisation",
  "idea_summary": "kort sammanfattning av startup-idén (max 2 meningar)",
  "idea_category": "en av: tech, social-impact, cleantech, health, education, fintech, food, other"
}

Svara ENBART med JSON-objektet.`;

export async function extractLeadData(
  conversationMessages: ChatMessage[],
  existingData: ExtractedLeadData = {},
): Promise<ExtractedLeadData> {
  try {
    const result = await createChatCompletion(
      EXTRACTION_PROMPT,
      conversationMessages,
      { temperature: 0.1, maxTokens: 512 },
    );

    const text = result.message.content.trim();

    // Try to parse JSON — handle cases where Claude wraps it in backticks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return existingData;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ExtractedLeadData>;

    // Merge: new data takes precedence, but don't overwrite with empty values
    return mergeExtracted(existingData, parsed);
  } catch (err) {
    console.error("[extract-lead-data] Extraction failed:", err);
    return existingData;
  }
}

// Whitelist merge — only keeps fields that are in the ExtractedLeadData
// contract, and never overwrites a present value with an empty one. This
// also keeps the conversations.extracted_data JSONB from accruing stray
// fields if Claude ever invents new ones.
const ALLOWED_KEYS: ReadonlyArray<keyof ExtractedLeadData> = [
  "name",
  "email",
  "phone",
  "municipality",
  "organization",
  "idea_summary",
  "idea_category",
];

function mergeExtracted(
  existing: ExtractedLeadData,
  incoming: Partial<ExtractedLeadData>,
): ExtractedLeadData {
  const merged: ExtractedLeadData = { ...existing };

  for (const key of ALLOWED_KEYS) {
    const value = incoming[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    merged[key] = trimmed;
  }

  return merged;
}

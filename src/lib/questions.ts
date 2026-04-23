import { getSupabaseAdmin } from "./supabase";
import { assignVariant } from "./variant";

export type QuestionType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "url"
  | "single_choice"
  | "multi_choice"
  | "number"
  | "scale_1_5"
  | "consent";

export type Question = {
  id: string;
  question_set_id: string;
  key: string;
  display_order: number;
  type: QuestionType;
  required: boolean;
  help_text: string | null;
  options: Array<{ value: string; label: string }>;
  validation: Record<string, unknown>;
  depends_on: Array<{ question_key: string; equals: unknown }>;
  is_active: boolean;
};

export type QuestionVariant = {
  id: string;
  question_id: string;
  label: string;
  text: string;
  help_text: string | null;
  weight: number;
  is_control: boolean;
  started_at: string | null;
  ended_at: string | null;
};

export type QuestionWithVariant = Question & {
  variant_id: string | null;
  variant_label: string | null;
  text: string;      // resolved text (from variant or null fallback)
  help: string | null;
};

/**
 * Return the active question list for a module, each question already
 * resolved to a specific variant for the given session id (deterministic).
 */
export async function getQuestionsForSession(
  moduleId: string,
  sessionId: string,
): Promise<QuestionWithVariant[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data: sets } = await admin
    .from("question_sets")
    .select("id")
    .eq("module_id", moduleId)
    .eq("is_active", true)
    .limit(1);

  const setId = sets?.[0]?.id;
  if (!setId) return [];

  const { data: questions } = await admin
    .from("questions")
    .select("*")
    .eq("question_set_id", setId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (!questions || questions.length === 0) return [];

  const { data: variants } = await admin
    .from("question_variants")
    .select("*")
    .in(
      "question_id",
      questions.map((q) => q.id),
    );

  const byQ = new Map<string, QuestionVariant[]>();
  for (const v of (variants ?? []) as QuestionVariant[]) {
    const arr = byQ.get(v.question_id) ?? [];
    arr.push(v);
    byQ.set(v.question_id, arr);
  }

  const resolved: QuestionWithVariant[] = [];
  for (const q of questions as Question[]) {
    const vs = (byQ.get(q.id) ?? []).filter((v) => v.ended_at == null);
    let pickedVariant: QuestionVariant | null = null;
    if (vs.length > 0) {
      pickedVariant = await assignVariant(sessionId, q.id, vs);
    }
    resolved.push({
      ...q,
      variant_id: pickedVariant?.id ?? null,
      variant_label: pickedVariant?.label ?? null,
      text: pickedVariant?.text ?? q.key,
      help: pickedVariant?.help_text ?? q.help_text,
    });
  }
  return resolved;
}

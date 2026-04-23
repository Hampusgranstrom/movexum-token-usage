import { NextResponse } from "next/server";
import { createChatCompletion } from "@/lib/anthropic-chat";
import { extractLeadData } from "@/lib/extract-lead-data";
import { scoreLead } from "@/lib/lead-scoring";
import { getSupabaseAdmin } from "@/lib/supabase";
import { INTAKE_SYSTEM_PROMPT } from "@/config/system-prompt";
import { getModuleBySlug } from "@/lib/modules";
import { hasConsent } from "@/lib/consent";
import type { ChatRequestBody, ExtractedLeadData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Abuse limits — chosen to allow a real conversation while stopping credit-drain.
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_CHARS = 40_000;

type ChatBody = ChatRequestBody & { moduleSlug?: string };

export async function POST(request: Request) {
  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    messages: clientMessages,
    sessionId,
    conversationId,
    moduleSlug,
  } = body;

  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 128) {
    return NextResponse.json({ error: "sessionId krävs." }, { status: 400 });
  }

  if (conversationId !== undefined && conversationId !== null) {
    if (typeof conversationId !== "string" || conversationId.length > 64) {
      return NextResponse.json(
        { error: "Ogiltigt conversationId." },
        { status: 400 },
      );
    }
  }

  if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
    return NextResponse.json(
      { error: "messages måste vara en icke-tom array." },
      { status: 400 },
    );
  }

  if (clientMessages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: `Konversationen är för lång (max ${MAX_MESSAGES} meddelanden).` },
      { status: 400 },
    );
  }

  let totalChars = 0;
  for (const m of clientMessages) {
    if (
      !m ||
      typeof m.content !== "string" ||
      (m.role !== "user" && m.role !== "assistant")
    ) {
      return NextResponse.json(
        { error: "Varje meddelande måste ha role='user'|'assistant' och content." },
        { status: 400 },
      );
    }
    if (m.content.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        { error: `Ett meddelande är för långt (max ${MAX_MESSAGE_CHARS} tecken).` },
        { status: 400 },
      );
    }
    totalChars += m.content.length;
  }
  if (totalChars > MAX_TOTAL_CHARS) {
    return NextResponse.json(
      { error: "Konversationen är för stor." },
      { status: 400 },
    );
  }

  // Resolve module + consent gate
  const mod = moduleSlug ? await getModuleBySlug(moduleSlug) : null;
  if (moduleSlug && !mod) {
    return NextResponse.json({ error: "module not found" }, { status: 404 });
  }
  if (mod && !(await hasConsent(mod.id, sessionId))) {
    return NextResponse.json({ error: "consent required" }, { status: 403 });
  }

  const systemPrompt = mod?.system_prompt || INTAKE_SYSTEM_PROMPT;
  const leadSourceId = mod?.lead_source_id ?? "ai-chat";
  const moduleId = mod?.id ?? null;

  try {
    const result = await createChatCompletion(systemPrompt, clientMessages);

    const supabase = getSupabaseAdmin();
    let convId = conversationId ?? null;
    let extractedData: ExtractedLeadData | null = null;
    let leadCreated = false;
    let leadId: string | null = null;

    if (supabase) {
      if (!convId) {
        const { data: conv, error: convErr } = await supabase
          .from("conversations")
          .insert({ session_id: sessionId, module_id: moduleId })
          .select("id")
          .single();
        if (!convErr && conv) convId = conv.id;
      }

      if (convId) {
        const lastUserMsg = clientMessages[clientMessages.length - 1];
        await supabase.from("messages").insert([
          {
            conversation_id: convId,
            role: lastUserMsg.role,
            content: lastUserMsg.content,
            input_tokens: 0,
            output_tokens: 0,
          },
          {
            conversation_id: convId,
            role: "assistant" as const,
            content: result.message.content,
            input_tokens: result.usage.inputTokens,
            output_tokens: result.usage.outputTokens,
          },
        ]);

        await supabase
          .from("conversations")
          .update({
            total_input_tokens: result.usage.inputTokens,
            total_output_tokens: result.usage.outputTokens,
          })
          .eq("id", convId);
      }

      try {
        let existingData: ExtractedLeadData = {};
        if (convId) {
          const { data: conv } = await supabase
            .from("conversations")
            .select("extracted_data")
            .eq("id", convId)
            .single();
          if (conv?.extracted_data) {
            existingData = conv.extracted_data as ExtractedLeadData;
          }
        }

        extractedData = await extractLeadData(clientMessages, existingData);

        if (convId && extractedData) {
          await supabase
            .from("conversations")
            .update({ extracted_data: extractedData })
            .eq("id", convId);
        }

        if (convId && extractedData?.name) {
          const { data: existingConv } = await supabase
            .from("conversations")
            .select("lead_id")
            .eq("id", convId)
            .single();

          if (!existingConv?.lead_id) {
            const { data: newLead, error: leadErr } = await supabase
              .from("leads")
              .insert({
                name: extractedData.name,
                email: extractedData.email ?? null,
                phone: extractedData.phone ?? null,
                organization: extractedData.organization ?? null,
                idea_summary: extractedData.idea_summary ?? null,
                idea_category: extractedData.idea_category ?? null,
                source_id: leadSourceId,
                source_detail: `Konversation ${convId}`,
                status: "new",
                module_id: moduleId,
              })
              .select("id")
              .single();

            if (!leadErr && newLead) {
              leadId = newLead.id;
              leadCreated = true;

              await supabase
                .from("conversations")
                .update({ lead_id: newLead.id })
                .eq("id", convId);

              // Mark module_session completed
              if (moduleId) {
                await supabase
                  .from("module_sessions")
                  .update({
                    lead_id: newLead.id,
                    completed_at: new Date().toISOString(),
                  })
                  .eq("module_id", moduleId)
                  .eq("session_id", sessionId);

                // Attach consent event to the lead
                await supabase
                  .from("consent_events")
                  .update({ lead_id: newLead.id })
                  .eq("module_id", moduleId)
                  .eq("session_id", sessionId);
              }

              await supabase.from("analytics_events").insert({
                event_type: "lead_created",
                lead_id: newLead.id,
                metadata: {
                  source: leadSourceId,
                  conversation_id: convId,
                  module_id: moduleId,
                },
              });

              scoreLead(extractedData)
                .then(async ({ score, reasoning }) => {
                  await supabase
                    .from("leads")
                    .update({ score, score_reasoning: reasoning })
                    .eq("id", newLead.id);
                })
                .catch(() => {
                  /* scoring is best-effort */
                });
            }
          } else {
            leadId = existingConv.lead_id;
            const updateFields: Record<string, unknown> = {};
            if (extractedData.email) updateFields.email = extractedData.email;
            if (extractedData.phone) updateFields.phone = extractedData.phone;
            if (extractedData.organization)
              updateFields.organization = extractedData.organization;
            if (extractedData.idea_summary)
              updateFields.idea_summary = extractedData.idea_summary;
            if (extractedData.idea_category)
              updateFields.idea_category = extractedData.idea_category;

            if (Object.keys(updateFields).length > 0) {
              await supabase
                .from("leads")
                .update(updateFields)
                .eq("id", existingConv.lead_id);
            }
          }
        }
      } catch {
        /* extraction is best-effort */
      }
    }

    return NextResponse.json({
      message: result.message,
      conversationId: convId,
      extractedData,
      leadCreated,
      leadId,
    });
  } catch (err) {
    // Log the real error but return a generic message to the client so we
    // don't leak library internals or Anthropic errors.
    console.error("[api/chat] failed:", err);
    return NextResponse.json(
      { error: "Tjänsten är tillfälligt otillgänglig. Försök igen." },
      { status: 500 },
    );
  }
}

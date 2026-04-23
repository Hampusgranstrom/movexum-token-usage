import { NextResponse } from "next/server";
import { createChatCompletion } from "@/lib/anthropic-chat";
import { extractLeadData } from "@/lib/extract-lead-data";
import { scoreLead } from "@/lib/lead-scoring";
import { getSupabaseAdmin } from "@/lib/supabase";
import { INTAKE_SYSTEM_PROMPT } from "@/config/system-prompt";
import { getClientIp, maybeReap, rateLimit } from "@/lib/rate-limit";
import type { ChatRequestBody, ExtractedLeadData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Abuse limits — chosen to allow a real conversation while stopping credit-drain.
const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;
const MAX_TOTAL_CHARS = 40_000;
const RATE_LIMIT = 20;               // requests
const RATE_WINDOW_MS = 60_000;       // per minute per IP

export async function POST(request: Request) {
  const ip = getClientIp(request);
  maybeReap(RATE_WINDOW_MS);
  const rl = rateLimit(`chat:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "För många förfrågningar. Försök igen om en stund." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) },
      },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages: clientMessages, sessionId, conversationId } = body;

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

  try {
    // 1. Call Claude with the intake system prompt
    const result = await createChatCompletion(
      INTAKE_SYSTEM_PROMPT,
      clientMessages,
    );

    const supabase = getSupabaseAdmin();
    let convId = conversationId ?? null;
    let extractedData: ExtractedLeadData | null = null;
    let leadCreated = false;
    let leadId: string | null = null;

    if (supabase) {
      // 2. Create or fetch conversation
      if (!convId) {
        const { data: conv, error: convErr } = await supabase
          .from("conversations")
          .insert({ session_id: sessionId })
          .select("id")
          .single();
        if (convErr) {
          console.error("[api/chat] conversation insert failed:", convErr.message);
        } else {
          convId = conv.id;
        }
      }

      // 3. Save messages
      if (convId) {
        const lastUserMsg = clientMessages[clientMessages.length - 1];
        const messagesToInsert = [
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
        ];

        const { error: msgErr } = await supabase
          .from("messages")
          .insert(messagesToInsert);
        if (msgErr) {
          console.error("[api/chat] messages insert failed:", msgErr.message);
        }

        // Update token counts on conversation
        await supabase
          .from("conversations")
          .update({
            total_input_tokens: result.usage.inputTokens,
            total_output_tokens: result.usage.outputTokens,
          })
          .eq("id", convId);
      }

      // 4. Extract lead data (non-blocking for response, but we await it here
      //    since we want to return the extracted data)
      try {
        // Get existing extracted data for this conversation
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

        // Save extracted data to conversation
        if (convId && extractedData) {
          await supabase
            .from("conversations")
            .update({ extracted_data: extractedData })
            .eq("id", convId);
        }

        // 5. Create lead if we have enough data (name at minimum)
        if (convId && extractedData?.name) {
          // Check if a lead was already created for this conversation
          const { data: existingConv } = await supabase
            .from("conversations")
            .select("lead_id")
            .eq("id", convId)
            .single();

          if (!existingConv?.lead_id) {
            // Create a new lead
            const { data: newLead, error: leadErr } = await supabase
              .from("leads")
              .insert({
                name: extractedData.name,
                email: extractedData.email ?? null,
                phone: extractedData.phone ?? null,
                organization: extractedData.organization ?? null,
                idea_summary: extractedData.idea_summary ?? null,
                idea_category: extractedData.idea_category ?? null,
                source_id: "ai-chat",
                source_detail: `Konversation ${convId}`,
                status: "new",
              })
              .select("id")
              .single();

            if (leadErr) {
              console.error("[api/chat] lead insert failed:", leadErr.message);
            } else if (newLead) {
              leadId = newLead.id;
              leadCreated = true;

              // Link conversation to lead
              await supabase
                .from("conversations")
                .update({ lead_id: newLead.id })
                .eq("id", convId);

              // Log analytics event
              await supabase.from("analytics_events").insert({
                event_type: "lead_created",
                lead_id: newLead.id,
                metadata: { source: "ai-chat", conversation_id: convId },
              });

              // Score the lead (fire-and-forget)
              scoreLead(extractedData)
                .then(async ({ score, reasoning }) => {
                  await supabase
                    .from("leads")
                    .update({ score, score_reasoning: reasoning })
                    .eq("id", newLead.id);
                })
                .catch((err) =>
                  console.error("[api/chat] scoring failed:", err),
                );
            }
          } else {
            // Update existing lead with new data
            leadId = existingConv.lead_id;
            const updateFields: Record<string, unknown> = {};
            if (extractedData.email) updateFields.email = extractedData.email;
            if (extractedData.phone) updateFields.phone = extractedData.phone;
            if (extractedData.organization) updateFields.organization = extractedData.organization;
            if (extractedData.idea_summary) updateFields.idea_summary = extractedData.idea_summary;
            if (extractedData.idea_category) updateFields.idea_category = extractedData.idea_category;

            if (Object.keys(updateFields).length > 0) {
              await supabase
                .from("leads")
                .update(updateFields)
                .eq("id", existingConv.lead_id);
            }
          }
        }
      } catch (extractErr) {
        console.error("[api/chat] extraction failed:", extractErr);
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

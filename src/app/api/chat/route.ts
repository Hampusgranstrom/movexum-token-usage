import { NextResponse } from "next/server";
import { createChatCompletion, type ChatMessage } from "@/lib/openai-chat";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Du är Movexums interna AI-assistent. Du hjälper teamet med frågor, analys, skrivande, brainstorming och kod. Svara på svenska om inte användaren skriver på ett annat språk. Var koncis och konkret.`;

type ChatRequestBody = {
  messages?: ChatMessage[];
  model?: string;
  userIdentifier?: string;
};

/**
 * POST /api/chat
 *
 * Tar emot konversationshistorik från klienten, anropar OpenAI Chat
 * Completions med en system-prompt och loggar tokens-förbrukningen till
 * Supabase (`token_usage_events`).
 *
 * Body: { messages: [{role, content}, ...], model?, userIdentifier? }
 */
export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clientMessages = body.messages ?? [];
  if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
    return NextResponse.json(
      { error: "Body måste innehålla en icke-tom 'messages'-array." },
      { status: 400 },
    );
  }

  // Validera roller
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
  }

  // Sätt in vår system-prompt först
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...clientMessages,
  ];

  try {
    const result = await createChatCompletion(messages, {
      model: body.model,
    });

    // Logga till Supabase (best-effort — om det misslyckas stoppar vi inte svaret)
    await logUsage({
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      userIdentifier: body.userIdentifier ?? "anonymous",
    });

    return NextResponse.json({
      message: result.message,
      model: result.model,
      usage: result.usage,
    });
  } catch (err) {
    console.error("[api/chat] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

async function logUsage(args: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  userIdentifier: string;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn(
      "[api/chat] Supabase är inte konfigurerad — usage loggas inte.",
    );
    return;
  }

  const { error } = await supabase.from("token_usage_events").insert({
    user_identifier: args.userIdentifier,
    model: args.model,
    input_tokens: args.inputTokens,
    output_tokens: args.outputTokens,
    source: "movexum-chat",
  });

  if (error) {
    console.error("[api/chat] Supabase insert failed:", error.message);
  }
}

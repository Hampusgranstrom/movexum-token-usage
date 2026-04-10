/**
 * OpenAI Chat Completions-klient.
 *
 * Används av /api/chat — vår egen chat-gateway. Varje anrop returnerar
 * både meddelandeinnehållet och `usage`-blocket som vi loggar till Supabase.
 *
 * Till skillnad från Usage API:t kräver den här en VANLIG projektnyckel
 * (börjar med "sk-" eller "sk-proj-"), inte en admin-nyckel.
 */

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatCompletionResult = {
  message: ChatMessage;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

type OpenAiChatResponse = {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: "assistant";
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

type OpenAiErrorResponse = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

/**
 * Anropar OpenAI Chat Completions API och returnerar svaret + tokens.
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number } = {},
): Promise<ChatCompletionResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY saknas i miljön. Skapa en projektnyckel på " +
        "https://platform.openai.com/api-keys och lägg den som " +
        "OPENAI_API_KEY i Vercel env vars.",
    );
  }

  const model = opts.model ?? "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const bodyText = await res.text();
    let detail = bodyText;
    try {
      const parsed = JSON.parse(bodyText) as OpenAiErrorResponse;
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      // ignore parse error
    }
    throw new Error(
      `OpenAI chat completions ${res.status} ${res.statusText}: ${detail}`,
    );
  }

  const json = (await res.json()) as OpenAiChatResponse;
  const choice = json.choices?.[0];
  if (!choice || !choice.message?.content) {
    throw new Error("OpenAI returnerade inget meddelandeinnehåll.");
  }

  return {
    message: {
      role: "assistant",
      content: choice.message.content,
    },
    model: json.model ?? model,
    usage: {
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      totalTokens: json.usage?.total_tokens ?? 0,
    },
  };
}

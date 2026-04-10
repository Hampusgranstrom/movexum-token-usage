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
 *
 * Använder OPENAI_API_KEY om den finns (rekommenderat — vanlig projekt-nyckel),
 * annars OPENAI_ADMIN_KEY som fallback. Observera att OpenAI:s admin-nycklar
 * historiskt inte har fått anropa model-endpoints som chat/completions —
 * om så är fallet returneras ett 401/403 och du behöver skapa en projekt-nyckel.
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number } = {},
): Promise<ChatCompletionResult> {
  const key = process.env.OPENAI_API_KEY ?? process.env.OPENAI_ADMIN_KEY;
  if (!key) {
    throw new Error(
      "Ingen OpenAI-nyckel hittades. Sätt OPENAI_API_KEY (reguljär projekt-nyckel) " +
        "eller OPENAI_ADMIN_KEY i Vercel env vars. Obs: admin-nycklar kan i regel " +
        "INTE anropa Chat Completions — skapa hellre en projekt-nyckel på " +
        "https://platform.openai.com/api-keys och sätt den som OPENAI_API_KEY.",
    );
  }

  const usingAdminKey =
    !process.env.OPENAI_API_KEY && !!process.env.OPENAI_ADMIN_KEY;
  if (usingAdminKey) {
    console.warn(
      "[openai-chat] Använder OPENAI_ADMIN_KEY som fallback — detta kommer " +
        "sannolikt avvisas av OpenAI eftersom admin-nycklar är scopade till " +
        "organisations-endpoints. Skapa en projekt-nyckel på platform.openai.com/api-keys " +
        "och sätt den som OPENAI_API_KEY för att lösa problemet.",
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

    // Specifik hint om admin-nyckeln avvisades
    if (usingAdminKey && (res.status === 401 || res.status === 403)) {
      throw new Error(
        `OpenAI avvisade admin-nyckeln (${res.status}): ${detail}. ` +
          "Detta bekräftar att admin-nycklar inte kan anropa Chat Completions. " +
          "Skapa en projekt-nyckel på https://platform.openai.com/api-keys, " +
          "lägg den som OPENAI_API_KEY i Vercel, och gör en Redeploy.",
      );
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

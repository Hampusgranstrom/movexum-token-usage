/**
 * Anthropic Claude chat client.
 *
 * Replaces the old OpenAI client. Uses the Anthropic SDK to call
 * Claude's Messages API. Each call returns the assistant message
 * plus token usage for tracking.
 */

import Anthropic from "@anthropic-ai/sdk";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatCompletionResult = {
  message: { role: "assistant"; content: string };
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
};

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Ingen Anthropic-nyckel hittades. Sätt ANTHROPIC_API_KEY i dina miljövariabler.",
    );
  }

  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * Calls the Claude Messages API and returns the response + usage.
 *
 * @param systemPrompt - The system prompt (passed separately in Anthropic API)
 * @param messages - The conversation history (user/assistant turns)
 * @param opts - Optional model and temperature overrides
 */
export async function createChatCompletion(
  systemPrompt: string,
  messages: ChatMessage[],
  opts: { model?: string; temperature?: number; maxTokens?: number } = {},
): Promise<ChatCompletionResult> {
  const client = getClient();
  const model = opts.model ?? "claude-sonnet-4-20250514";

  const response = await client.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.7,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const content = textBlock && "text" in textBlock ? textBlock.text : "";

  return {
    message: { role: "assistant", content },
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}

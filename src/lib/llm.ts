import OpenAI from "openai";
import { createThinkStripper } from "./text";

const globalState = globalThis as unknown as { __minimax?: OpenAI };

function client(): OpenAI {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY n'est pas défini : ajoutez-le dans le fichier .env.");
  globalState.__minimax ??= new OpenAI({
    apiKey,
    baseURL: process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1",
  });
  return globalState.__minimax;
}

export const MODEL = process.env.MINIMAX_MODEL ?? "MiniMax-M3.1-Flash";

/**
 * Appel en streaming à MiniMax (API compatible OpenAI). Le raisonnement du modèle est séparé
 * (`reasoning_split`) et n'est jamais renvoyé ; seules les portions de réponse sont produites.
 */
export async function* streamCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const params = {
    model: MODEL,
    messages,
    stream: true as const,
    max_completion_tokens: Number(process.env.MINIMAX_MAX_TOKENS ?? 12000),
    // Paramètres propres à MiniMax, transmis tels quels par le SDK.
    reasoning_split: true,
    reasoning_effort: process.env.MINIMAX_REASONING_EFFORT ?? "medium",
  } as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming;

  const stream = await client().chat.completions.create(params, { signal });
  const strip = createThinkStripper();
  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content;
    if (delta) {
      const text = strip(delta);
      if (text) yield text;
    }
  }
}

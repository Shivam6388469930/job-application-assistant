import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const DEFAULT_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
];

type GroqChatNonStreamingParams = Parameters<typeof groq.chat.completions.create>[0];

export async function createGroqChatCompletion(
  params: Omit<GroqChatNonStreamingParams, "model"> & {
    model?: string;
  }
): Promise<Groq.Chat.Completions.ChatCompletion> {
  const modelsToTry = params.model
    ? [params.model, ...DEFAULT_MODELS.filter((m) => m !== params.model)]
    : DEFAULT_MODELS;

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await groq.chat.completions.create({
        ...params,
        model,
        stream: false,
      } as GroqChatNonStreamingParams);
      return response as Groq.Chat.Completions.ChatCompletion;
    } catch (err: any) {
      console.warn(`[Groq] Model ${model} failed:`, err?.message || err);
      lastError = err;
      // Continue to next model fallback
    }
  }

  throw lastError || new Error("All Groq AI models failed to respond");
}
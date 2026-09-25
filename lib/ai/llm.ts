import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { generateText, Output, type LanguageModel } from "ai";
import type { z } from "zod";

import { DEFAULT_LLM_MODEL } from "@/lib/ai/providers";
import { getServerEnv, type ServerEnv } from "@/lib/env";

/**
 * Single entry point for every LLM call. The provider comes from LLM_PROVIDER
 * (default: "mistral"); the Vercel AI SDK is the only layer between the app and it.
 */

function resolveModel(env: ServerEnv): {
  model: LanguageModel;
  modelId: string;
} {
  switch (env.LLM_PROVIDER) {
    case "mistral": {
      const modelId = env.LLM_MODEL ?? DEFAULT_LLM_MODEL.mistral;
      const mistral = createMistral({ apiKey: env.MISTRAL_API_KEY });
      return { model: mistral(modelId), modelId };
    }
    case "google": {
      const modelId = env.LLM_MODEL ?? DEFAULT_LLM_MODEL.google;
      const google = createGoogleGenerativeAI({
        apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return { model: google(modelId), modelId };
    }
  }
}

export type Extraction<T> = {
  output: T;
  provider: string;
  model: string;
  durationMs: number;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
};

/**
 * Extracts structured data matching `schema` from `input`.
 *
 * `instructions` is our own fixed system prompt. `input` is untrusted data
 * (a transcript, an imported file): it only ever travels in the user message,
 * wrapped in a tag, and is never concatenated into the system prompt.
 */
export async function extract<T>(
  schema: z.ZodType<T>,
  input: string,
  instructions: string,
): Promise<Extraction<T>> {
  const env = getServerEnv();
  const { model, modelId } = resolveModel(env);
  const startedAt = performance.now();

  const result = await generateText({
    model,
    temperature: 0,
    system: instructions,
    messages: [{ role: "user", content: `<data>\n${input}\n</data>` }],
    output: Output.object({ schema }),
  });

  return {
    output: result.output,
    provider: env.LLM_PROVIDER,
    model: modelId,
    durationMs: Math.round(performance.now() - startedAt),
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  };
}

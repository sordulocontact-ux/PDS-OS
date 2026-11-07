import "server-only";

import {
  createAnthropic,
  type AnthropicLanguageModelOptions,
} from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import {
  generateText,
  NoObjectGeneratedError,
  Output,
  type LanguageModel,
  type LanguageModelUsage,
  type SystemModelMessage,
  type UserContent,
} from "ai";
import type { z } from "zod";

import { repairedOutput } from "@/lib/ai/output-repair";
import { DEFAULT_LLM_MODEL, type LlmProvider } from "@/lib/ai/providers";
import { takeAiRequest } from "@/lib/ai/quota";
import { getServerEnv, type ServerEnv } from "@/lib/env";

/**
 * Single entry point for every LLM call. The provider comes from LLM_PROVIDER
 * (default: "mistral"); the Vercel AI SDK is the only layer between the app and it.
 * Every call takes one request from the member's daily quota first
 * (lib/ai/quota.ts): extractions here, PO messages in its route.
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
    case "anthropic": {
      const modelId = env.LLM_MODEL ?? DEFAULT_LLM_MODEL.anthropic;
      const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
      return { model: anthropic(modelId), modelId };
    }
  }
}

type ProviderSettings = Pick<
  Parameters<typeof generateText>[0],
  "temperature" | "providerOptions"
>;

/**
 * Settings sent with every call, by provider.
 * - Claude Haiku 5.5 answers 400 to any sampling parameter (temperature,
 *   top_p, top_k), and thinks with effort "medium" by default: "low" keeps
 *   PO's replies and the extractions fast.
 * - The others take temperature 0: the same input gives the same output.
 */
function providerSettings(provider: LlmProvider): ProviderSettings {
  switch (provider) {
    case "anthropic":
      return {
        providerOptions: {
          anthropic: { effort: "low" } satisfies AnthropicLanguageModelOptions,
        },
      };
    case "mistral":
    case "google":
      return { temperature: 0 };
  }
}

/**
 * One piece of a system prompt. `stable`: identical from one call to the
 * next (rules) — never a name, a date, a page or an identifier.
 */
export type InstructionPart = { text: string; stable: boolean };

/**
 * The system prompt as the provider takes it. With Anthropic, the stable
 * parts come first and end on a cache breakpoint: tools (sent before the
 * system prompt) and rules are then read from the prompt cache, the
 * variable parts follow. Elsewhere, the parts are joined in their order.
 */
function systemPrompt(
  provider: LlmProvider,
  parts: InstructionPart[],
): string | SystemModelMessage[] {
  const join = (list: InstructionPart[]) => list.map((p) => p.text).join("");
  if (provider !== "anthropic") return join(parts);
  const stable = join(parts.filter((p) => p.stable));
  const variable = join(parts.filter((p) => !p.stable));
  return [
    {
      role: "system",
      content: stable,
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
    ...(variable ? [{ role: "system" as const, content: variable }] : []),
  ];
}

/**
 * The configured chat model and its call settings (system prompt included),
 * for the assistant's streamed conversation: spread `settings` into the
 * call. The caller takes the quota request (one per message).
 */
export function getChatModel(instructions: InstructionPart[]): {
  model: LanguageModel;
  provider: string;
  modelId: string;
  settings: ProviderSettings & { system: string | SystemModelMessage[] };
} {
  const env = getServerEnv();
  const { model, modelId } = resolveModel(env);
  return {
    model,
    provider: env.LLM_PROVIDER,
    modelId,
    settings: {
      ...providerSettings(env.LLM_PROVIDER),
      system: systemPrompt(env.LLM_PROVIDER, instructions),
    },
  };
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
  return generate(schema, `<data>\n${input}\n</data>`, instructions);
}

/**
 * Same as `extract`, for one image (a screenshot): the image travels alone in
 * the user message, as untrusted data. The default models read images
 * (ministral-14b, Claude Haiku 5.5: PNG, JPEG, WebP, GIF).
 */
export async function extractFromImage<T>(
  schema: z.ZodType<T>,
  image: { data: Uint8Array; mediaType: string },
  instructions: string,
): Promise<Extraction<T>> {
  return extractFromImages(schema, [image], instructions);
}

/**
 * Same as `extractFromImage`, for a few images read together (a moodboard):
 * they travel alone in one user message, as untrusted data.
 */
export async function extractFromImages<T>(
  schema: z.ZodType<T>,
  images: Array<{ data: Uint8Array; mediaType: string }>,
  instructions: string,
): Promise<Extraction<T>> {
  return generate(
    schema,
    // A file part with an image type: the AI SDK's form for images.
    images.map((image) => ({
      type: "file" as const,
      data: image.data,
      mediaType: image.mediaType,
    })),
    instructions,
  );
}

async function generate<T>(
  schema: z.ZodType<T>,
  content: UserContent,
  instructions: string,
): Promise<Extraction<T>> {
  const env = getServerEnv();
  const { model, modelId } = resolveModel(env);
  await takeAiRequest();
  const startedAt = performance.now();

  let output: T;
  let usage: LanguageModelUsage | undefined;
  try {
    const result = await generateText({
      model,
      ...providerSettings(env.LLM_PROVIDER),
      system: instructions,
      messages: [{ role: "user", content }],
      output: Output.object({ schema }),
    });
    output = result.output;
    usage = result.usage;
  } catch (error) {
    const repaired = repairedOutput(error, schema);
    if (repaired === undefined) throw error;
    output = repaired;
    usage = NoObjectGeneratedError.isInstance(error) ? error.usage : undefined;
  }

  return {
    output,
    provider: env.LLM_PROVIDER,
    model: modelId,
    durationMs: Math.round(performance.now() - startedAt),
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
  };
}

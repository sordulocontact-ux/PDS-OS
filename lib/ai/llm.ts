import "server-only";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import {
  generateText,
  NoObjectGeneratedError,
  Output,
  type LanguageModel,
  type LanguageModelUsage,
  type UserContent,
} from "ai";
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

/** The configured chat model, for the assistant's streamed conversation. */
export function getChatModel(): {
  model: LanguageModel;
  provider: string;
  modelId: string;
} {
  const env = getServerEnv();
  const { model, modelId } = resolveModel(env);
  return { model, provider: env.LLM_PROVIDER, modelId };
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
 * the user message, as untrusted data. The default Mistral model
 * (ministral-14b) reads images.
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
  const startedAt = performance.now();

  let output: T;
  let usage: LanguageModelUsage | undefined;
  try {
    const result = await generateText({
      model,
      temperature: 0,
      system: instructions,
      messages: [{ role: "user", content }],
      output: Output.object({ schema }),
    });
    output = result.output;
    usage = result.usage;
  } catch (error) {
    const echoed = fromSchemaEcho(error, schema);
    if (echoed === undefined) throw error;
    output = echoed;
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

/**
 * ministral-14b sometimes wraps a correct answer in the shape of the schema
 * itself: {"type":"object","properties":{…the answer…}} (seen on feedback
 * triage, 2026-09-27). When the answer did not match the schema, the content
 * of `properties` is validated in its place; anything else stays an error.
 */
function fromSchemaEcho<T>(
  error: unknown,
  schema: z.ZodType<T>,
): T | undefined {
  if (!NoObjectGeneratedError.isInstance(error) || !error.text) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(error.text);
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== "object" || !("properties" in parsed))
    return;
  const result = schema.safeParse(parsed.properties);
  return result.success ? result.data : undefined;
}

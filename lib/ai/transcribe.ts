import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { transcribe as sdkTranscribe, type TranscriptionModel } from "ai";

import { groqTolerantFetch } from "@/lib/ai/groq-tolerant-fetch";
import { DEFAULT_TRANSCRIPTION_MODEL } from "@/lib/ai/providers";
import type { Transcript } from "@/lib/ai/schemas/transcript";
import { getServerEnv, type ServerEnv } from "@/lib/env";

export type { Transcript } from "@/lib/ai/schemas/transcript";

/**
 * Single entry point for speech-to-text. The provider comes from
 * TRANSCRIPTION_PROVIDER (default: "groq"), through the Vercel AI SDK.
 */

function resolveModel(env: ServerEnv): {
  model: TranscriptionModel;
  modelId: string;
} {
  switch (env.TRANSCRIPTION_PROVIDER) {
    case "groq": {
      const modelId =
        env.TRANSCRIPTION_MODEL ?? DEFAULT_TRANSCRIPTION_MODEL.groq;
      const groq = createGroq({
        apiKey: env.GROQ_API_KEY,
        fetch: groqTolerantFetch,
      });
      return { model: groq.transcription(modelId), modelId };
    }
  }
}

export type Transcription = {
  transcript: Transcript;
  provider: string;
  model: string;
  durationMs: number;
};

export async function transcribe(audio: Uint8Array): Promise<Transcription> {
  const env = getServerEnv();
  const { model, modelId } = resolveModel(env);
  const startedAt = performance.now();

  const result = await sdkTranscribe({
    model,
    audio,
    providerOptions: {
      // verbose_json is what returns timed segments, needed for provenance.
      groq: {
        language: "fr",
        responseFormat: "verbose_json",
        timestampGranularities: ["segment"],
      },
    },
  });

  return {
    transcript: {
      text: result.text,
      language: result.language,
      durationSeconds: result.durationInSeconds,
      segments: result.segments.map((segment) => ({
        start: segment.startSecond,
        end: segment.endSecond,
        text: segment.text.trim(),
      })),
    },
    provider: env.TRANSCRIPTION_PROVIDER,
    model: modelId,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

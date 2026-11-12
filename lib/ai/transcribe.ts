import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { transcribe as sdkTranscribe, type TranscriptionModel } from "ai";

import { groqTolerantFetch } from "@/lib/ai/groq-tolerant-fetch";
import { isHallucination } from "@/lib/ai/silence";
import { DEFAULT_TRANSCRIPTION_MODEL } from "@/lib/ai/providers";
import { splitWebm, type AudioPiece } from "@/lib/ai/webm-split";
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

/**
 * Groq refuses a file over 25 Mo (free tier): a 2 h call recorded in the app
 * weighs ~36 Mo. A longer WebM is sent in pieces cut at cluster boundaries,
 * transcribed one after the other (the provider's per-minute limits) and put
 * back together on their place in the recording. Margin kept for the form.
 */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function transcribe(audio: Uint8Array): Promise<Transcription> {
  const pieces =
    audio.byteLength > MAX_FILE_BYTES ? splitWebm(audio, MAX_FILE_BYTES) : null;
  // Not a WebM this code can cut (an imported mp3, m4a): sent as is, the
  // provider says if it is too big.
  if (!pieces || pieces.length < 2) return transcribeOne(audio);

  const results: Array<{ piece: AudioPiece; result: Transcription }> = [];
  for (const piece of pieces)
    results.push({ piece, result: await transcribeOne(piece.audio) });
  return joinPieces(results);
}

function joinPieces(
  results: Array<{ piece: AudioPiece; result: Transcription }>,
): Transcription {
  const last = results.at(-1)!;
  return {
    transcript: {
      text: results
        .map(({ result }) => result.transcript.text.trim())
        .filter(Boolean)
        .join("\n"),
      language: results.find(({ result }) => result.transcript.language)?.result
        .transcript.language,
      durationSeconds:
        last.piece.startSeconds + (last.result.transcript.durationSeconds ?? 0),
      segments: results.flatMap(({ piece, result }) =>
        result.transcript.segments.map((s) => ({
          ...s,
          start: s.start + piece.startSeconds,
          end: s.end + piece.startSeconds,
        })),
      ),
    },
    provider: last.result.provider,
    model: last.result.model,
    durationMs: results.reduce((sum, { result }) => sum + result.durationMs, 0),
  };
}

async function transcribeOne(audio: Uint8Array): Promise<Transcription> {
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

  // Last guard (a provider without segments): a text Whisper invents on
  // silence is no transcript at all (lib/ai/silence.ts).
  const silent = isHallucination(result.text);
  return {
    transcript: {
      text: silent ? "" : result.text,
      language: result.language,
      durationSeconds: result.durationInSeconds,
      segments: (silent ? [] : result.segments).map((segment) => ({
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

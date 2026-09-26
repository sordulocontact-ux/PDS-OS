import "server-only";

import type { z } from "zod";

import { extract } from "@/lib/ai/llm";
import { locateQuote } from "@/lib/ai/provenance";
import type { Transcript } from "@/lib/ai/schemas/transcript";
import { transcribe } from "@/lib/ai/transcribe";
import { classifyProviderError } from "@/lib/calls/provider-error";
import type { DictationResponse, VoiceErrorCode } from "@/lib/voice/constants";

/**
 * Dictation, common to every stage: audio → transcript → proposals.
 *
 * A stage only describes its form through an adapter. The model gets the
 * current values and the dictated words as data (never in the system prompt),
 * and answers in the adapter's closed schema. Nothing is written here: the
 * proposals go back to the user, who accepts or rejects each one.
 */

/** True when the quote is really in what was said: the first hallucination signal. */
export type Locate = (quote: string) => boolean;

export type VoiceAdapter<State, Output, Proposal> = {
  /** Current values of the form, read with the user's session (RLS). */
  loadState: (projectId: string) => Promise<State | null>;
  /** The current values, written as plain text for the model. */
  describe: (state: State) => string;
  schema: z.ZodType<Output>;
  instructions: string;
  /** Keeps what is valid and new, attaching to each item whether it was found. */
  toProposals: (output: Output, state: State, locate: Locate) => Proposal[];
};

export async function dictate<State, Output, Proposal>(
  adapter: VoiceAdapter<State, Output, Proposal>,
  projectId: string,
  audio: Uint8Array,
): Promise<DictationResponse<Proposal>> {
  const state = await adapter.loadState(projectId);
  if (!state) return fail("not_found");

  let transcript: Transcript;
  try {
    transcript = (await transcribe(audio)).transcript;
  } catch (error) {
    console.error("[voice] transcription failed:", error);
    return fail(providerError(error));
  }
  const heard = transcript.text.trim();
  if (heard === "") return fail("nothing_heard");

  let output: Output;
  try {
    const input = `<etat_actuel>\n${adapter.describe(state)}\n</etat_actuel>\n<dictee>\n${heard}\n</dictee>`;
    output = (await extract(adapter.schema, input, adapter.instructions))
      .output;
  } catch (error) {
    console.error("[voice] extraction failed:", error);
    return fail(providerError(error));
  }

  const locate: Locate = (quote) =>
    locateQuote(quote, transcript).status !== "missing";
  const proposals = adapter.toProposals(output, state, locate);
  if (proposals.length === 0) return fail("nothing_understood");
  return { ok: true, heard, proposals };
}

function providerError(error: unknown): VoiceErrorCode {
  const code = classifyProviderError(error);
  return code === "audio_too_large" || code === "provider_quota"
    ? code
    : "provider_error";
}

const fail = (error: VoiceErrorCode) => ({ ok: false, error }) as const;

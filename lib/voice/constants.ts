/**
 * Dictation values shared by server and client code. A dictation is a short
 * spoken message that fills or edits a form; the audio is never stored.
 */

/** Stages that accept dictation. Each one has an adapter in lib/voice/adapters.ts. */
export const VOICE_STAGES = ["framing"] as const;
export type VoiceStage = (typeof VOICE_STAGES)[number];

export function isVoiceStage(value: string): value is VoiceStage {
  return (VOICE_STAGES as readonly string[]).includes(value);
}

/** The recorder stops by itself after this long. */
export const MAX_DICTATION_SECONDS = 120;
/** Two minutes of Opus at 32 kbit/s is under 500 KB: this leaves a wide margin. */
export const MAX_DICTATION_BYTES = 2 * 1024 * 1024;

export type VoiceErrorCode =
  | "unauthorized"
  | "forbidden"
  | "invalid_input"
  | "not_found"
  | "audio_too_large"
  | "nothing_heard"
  | "nothing_understood"
  | "provider_quota"
  | "provider_error";

/** What the dictation route answers. `heard` is shown before the proposals. */
export type DictationResponse<P> =
  | { ok: true; heard: string; proposals: P[] }
  | { ok: false; error: VoiceErrorCode };

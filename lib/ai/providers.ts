/**
 * Provider catalogue. Names only — no secrets, safe to import anywhere.
 * Switching provider is an environment change (LLM_PROVIDER, TRANSCRIPTION_PROVIDER),
 * never a code change outside lib/ai/.
 */

export const LLM_PROVIDERS = ["mistral", "google", "anthropic"] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];
export const DEFAULT_LLM_PROVIDER: LlmProvider = "mistral";

export const TRANSCRIPTION_PROVIDERS = ["groq"] as const;
export type TranscriptionProvider = (typeof TRANSCRIPTION_PROVIDERS)[number];
export const DEFAULT_TRANSCRIPTION_PROVIDER: TranscriptionProvider = "groq";

/**
 * Model used when LLM_MODEL / TRANSCRIPTION_MODEL is not set.
 * Mistral's free tier gives a zero quota on mistral-small/medium (checked
 * 2026-09-25): ministral-14b is the most capable model it opens.
 * Claude Haiku 5.5 is the production choice (benchmark of 14/10/2026: best
 * intelligence / price / speed, requests not used for training).
 */
export const DEFAULT_LLM_MODEL = {
  mistral: "ministral-14b-latest",
  google: "gemini-flash-latest",
  anthropic: "claude-haiku-5-5",
} as const satisfies Record<LlmProvider, string>;

export const DEFAULT_TRANSCRIPTION_MODEL = {
  groq: "whisper-large-v3-turbo",
} as const satisfies Record<TranscriptionProvider, string>;

/** Environment variable holding the API key of each provider. */
export const PROVIDER_API_KEY = {
  mistral: "MISTRAL_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  groq: "GROQ_API_KEY",
} as const satisfies Record<LlmProvider | TranscriptionProvider, string>;

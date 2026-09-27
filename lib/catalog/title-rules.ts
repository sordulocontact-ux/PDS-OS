// Audio state and variant of a title (docs/ARCHITECTURE.md § 2 septies).
// Two separate facts: how far the song has come, and which cut of it this
// is. Client-safe; the database checks the same values.

import { fr } from "@/lib/i18n/fr";

/** From the first demo to the final master, in order. */
export const AUDIO_STATES = [
  "demo",
  "rough_mix",
  "master",
  "final_master",
] as const;
export type AudioState = (typeof AUDIO_STATES)[number];

export function isAudioState(value: unknown): value is AudioState {
  return (AUDIO_STATES as readonly unknown[]).includes(value);
}

/** What a select submits for "Non renseigné": read as null. */
export const UNKNOWN_AUDIO_STATE = "unknown";

/** Null when the state is unknown (never guessed). */
export const audioStateOf = (value: string | null): AudioState | null =>
  isAudioState(value) ? value : null;

export const VARIANTS = [
  "original",
  "radio_edit",
  "instrumental",
  "acapella",
  "remix",
  "other",
] as const;
export type Variant = (typeof VARIANTS)[number];

export const DEFAULT_VARIANT: Variant = "original";

export function isVariant(value: unknown): value is Variant {
  return (VARIANTS as readonly unknown[]).includes(value);
}

// The column is checked in SQL; the fallback only satisfies the type.
export const variantOf = (value: string): Variant =>
  isVariant(value) ? value : DEFAULT_VARIANT;

/** "Instrumental", or the words given for "Autre"; null for the original. */
export function variantText(title: {
  variant: Variant;
  variantLabel: string | null;
}): string | null {
  if (title.variant === "original") return null;
  if (title.variant === "other")
    return title.variantLabel ?? fr.catalog.variants.other;
  return fr.catalog.variants[title.variant];
}

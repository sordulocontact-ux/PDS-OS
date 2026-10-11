// Conception: the closed choices of each intention question, answered like
// the Stratégie's (lib/strategy/choices.ts) — checking choices composes the
// answer (code, no AI), the person retouches it, then saves. The single
// place to change the answers offered: keys are stored with the intention
// (design_intentions.choices), labels and phrases live in
// lib/i18n/fr/conception-work.ts (choices). Client-safe.

import type { DesignTopic } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";
import type { ChoiceValue } from "@/lib/ui/choice-value";
import { asSentence, joinList } from "@/lib/utils/sentences";

export const INTENTION_CHOICES = {
  story: [
    "artist_story",
    "lyrics",
    "portrait",
    "performance",
    "concept",
    "universe",
  ],
  look: ["minimal", "cinematic", "raw", "colorful", "dark", "retro"],
  tone: [
    "intimate",
    "energetic",
    "melancholic",
    "bright",
    "offbeat",
    "committed",
  ],
  musts: [
    "artist_on_screen",
    "lyrics_on_screen",
    "visual_identity",
    "vertical_format",
    "no_brands",
    "no_explicit",
  ],
} as const satisfies Record<DesignTopic, readonly string[]>;

// Incontournables et interdits: these are what must stay out.
const AVOID: ReadonlySet<string> = new Set(["no_brands", "no_explicit"]);

export const MAX_OTHER_CHARS = 300;

export function isIntentionChoice(topic: DesignTopic, value: unknown): boolean {
  return (
    typeof value === "string" &&
    (INTENTION_CHOICES[topic] as readonly string[]).includes(value)
  );
}

/** A stored value read defensively: unknown keys are dropped. */
export function toIntentionChoices(
  topic: DesignTopic,
  raw: unknown,
): ChoiceValue {
  const value = (raw ?? {}) as { choices?: unknown; other?: unknown };
  const choices = Array.isArray(value.choices)
    ? value.choices.filter((c): c is string => isIntentionChoice(topic, c))
    : [];
  const other =
    typeof value.other === "string" && value.other.trim() !== ""
      ? value.other.trim()
      : null;
  return { choices: [...new Set(choices)], other };
}

/** The answer written from the checked choices, in the order offered. */
export function composeIntention(
  topic: DesignTopic,
  value: ChoiceValue,
): string {
  const t = fr.conceptionWork.choices;
  const phrases: Record<string, string> = t.phrases[topic];
  const ordered = INTENTION_CHOICES[topic].filter((c) =>
    value.choices.includes(c),
  );
  const list = (keys: readonly string[]) =>
    joinList(
      keys.map((c) => phrases[c]),
      t.and,
    );
  const keep = ordered.filter((c) => !AVOID.has(c));
  const avoid = ordered.filter((c) => AVOID.has(c));
  const parts =
    topic === "musts"
      ? [
          keep.length ? t.sentences.musts(list(keep)) : "",
          avoid.length ? t.sentences.avoid(list(avoid)) : "",
        ]
      : [ordered.length ? t.sentences[topic](list(ordered)) : ""];
  return [...parts, value.other ? asSentence(value.other) : ""]
    .filter(Boolean)
    .join(" ");
}

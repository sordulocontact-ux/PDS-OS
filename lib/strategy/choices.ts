// Closed-choice questions of the Strategy, one per text field. The single
// place to change the answers offered: keys are stored, labels live in
// lib/i18n/fr/strategy.ts (choices). Client-safe.

import type { StrategyTextField } from "@/lib/framing/brief";

export const STRATEGY_CHOICES = {
  positioning: [
    "retain_fans",
    "win_new_audience",
    "reach_professionals",
    "artistic_credibility",
    "maximize_streaming",
    "prepare_next",
  ],
  audiences: [
    "current_fans",
    "new_audience",
    "professionals",
    "brands_partners",
    "local_scene",
  ],
  narrative: [
    "personal_story",
    "new_sound",
    "universe_continuity",
    "collaboration",
    "moment_place",
  ],
} as const satisfies Record<StrategyTextField, readonly string[]>;

export type StrategyChoiceKey<F extends StrategyTextField> =
  (typeof STRATEGY_CHOICES)[F][number];

import type { ChoiceValue } from "@/lib/ui/choice-value";
export type { ChoiceValue };

// One pre-checked answer, with the passage that justifies it. `source` is
// "brief:<field>" or "item:<report item id>"; the quote was found verbatim
// in that source by code before being stored.
export type ChoiceSuggestion = {
  choice: string;
  source: string;
  sourceLabel: string;
  quote: string;
};

export const choicesKey = (field: StrategyTextField) => `${field}_choices`;
export const suggestionsKey = (field: StrategyTextField) =>
  `${field}_suggestions`;

export function isChoiceOf(field: StrategyTextField, value: unknown): boolean {
  return (
    typeof value === "string" &&
    (STRATEGY_CHOICES[field] as readonly string[]).includes(value)
  );
}

// Reads a stored value defensively: unknown keys are dropped.
export function toChoiceValue(
  field: StrategyTextField,
  raw: unknown,
): ChoiceValue {
  const value = (raw ?? {}) as { choices?: unknown; other?: unknown };
  const choices = Array.isArray(value.choices)
    ? value.choices.filter((c) => isChoiceOf(field, c))
    : [];
  const other =
    typeof value.other === "string" && value.other.trim() !== ""
      ? value.other.trim()
      : null;
  return { choices: [...new Set(choices as string[])], other };
}

export function toSuggestions(
  field: StrategyTextField,
  raw: unknown,
): ChoiceSuggestion[] {
  const items = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const i = item as Partial<ChoiceSuggestion>;
    return isChoiceOf(field, i.choice) &&
      typeof i.source === "string" &&
      typeof i.quote === "string"
      ? [
          {
            choice: i.choice as string,
            source: i.source,
            sourceLabel: typeof i.sourceLabel === "string" ? i.sourceLabel : "",
            quote: i.quote,
          },
        ]
      : [];
  });
}

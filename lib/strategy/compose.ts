// Writes a Strategy answer from the checked choices: deterministic code, no
// AI. The owner then edits or completes it freely. Client-safe.

import type { StrategyTextField } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import type { ChoiceValue } from "@/lib/strategy/choices";
import { asSentence, joinList } from "@/lib/utils/sentences";

export function composeAnswer(
  field: StrategyTextField,
  value: ChoiceValue,
): string {
  const t = fr.strategy.choices;
  const phrases: Record<string, string> = t.phrases[field];
  const fragments = value.choices.flatMap((c) =>
    phrases[c] ? [phrases[c]] : [],
  );
  const parts = [
    fragments.length ? t.sentences[field](joinList(fragments, t.and)) : "",
    value.other ? asSentence(value.other) : "",
  ];
  return parts.filter(Boolean).join(" ");
}

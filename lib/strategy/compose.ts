// Writes a Strategy answer from the checked choices: deterministic code, no
// AI. The owner then edits or completes it freely. Client-safe.

import type { FieldState, StrategyTextField } from "@/lib/framing/brief";
import { strategy } from "@/lib/i18n/fr/strategy";
import type { ChoiceValue } from "@/lib/strategy/choices";
import { asSentence, joinList } from "@/lib/utils/sentences";

const fr = { strategy };

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

/**
 * The answer of a question as the rest of the strategy reads it (MKT-S1-01):
 * the saved text, else the sentence composed from the confirmed choices —
 * checked by the owner, so a confirmed answer, never « Non renseigné ».
 */
export function answerWithChoices<K extends StrategyTextField>(
  field: FieldState<K>,
  value: ChoiceValue,
): FieldState<K> {
  if (field.value) return field;
  const composed = composeAnswer(field.key, value);
  return composed
    ? { ...field, value: composed, status: "confirmed", provenance: null }
    : field;
}

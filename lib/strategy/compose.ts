// Writes a Strategy answer from the checked choices: deterministic code, no
// AI. The owner then edits or completes it freely. Client-safe.

import type { StrategyTextField } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import type { ChoiceValue } from "@/lib/strategy/choices";

// "a", "a et b", "a, b et c".
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${fr.strategy.choices.and} ${items.at(-1)}`;
}

function asSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const capitalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

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
    fragments.length ? t.sentences[field](joinList(fragments)) : "",
    value.other ? asSentence(value.other) : "",
  ];
  return parts.filter(Boolean).join(" ");
}

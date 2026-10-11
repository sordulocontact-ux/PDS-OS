// Writing an answer from checked choices: deterministic code, no AI
// (Stratégie, Conception). Client-safe.

/** "a", "a et b", "a, b et c". */
export function joinList(items: string[], and: string): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}`;
}

/** Capitalized, ending with a full stop unless it already ends a sentence. */
export function asSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const capitalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

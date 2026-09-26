import "server-only";

import { COUNTRY_CODES, countryName } from "@/lib/catalog/countries";
import type { DraftChange } from "@/lib/assistant/drafts";

// Names given by the model are matched by code against what the user can
// see: an unknown or ambiguous name matches nothing, never a guess.

export const foldName = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export function matchByName<T>(
  items: readonly T[],
  name: string,
  key: (item: T) => string,
): T | null {
  const wanted = foldName(name);
  if (!wanted) return null;
  const exact = items.filter((item) => foldName(key(item)) === wanted);
  if (exact.length > 0) return exact.length === 1 ? exact[0] : null;
  const partial = items.filter((item) => {
    const k = foldName(key(item));
    return k.includes(wanted) || (k.length >= 3 && wanted.includes(k));
  });
  return partial.length === 1 ? partial[0] : null;
}

/** "France", "france", "FR" → "FR". Null when unknown. */
export function countryCodeOf(input: string): string | null {
  const upper = input.trim().toUpperCase();
  if (COUNTRY_CODES.has(upper)) return upper;
  const wanted = foldName(input);
  for (const code of COUNTRY_CODES) {
    if (foldName(countryName(code) ?? "") === wanted) return code;
  }
  return null;
}

/** A card line, only when something is proposed and differs. */
export function change(
  changes: DraftChange[],
  label: string,
  before: string | null | undefined,
  after: string | null | undefined,
) {
  if (!after || after === before) return;
  changes.push({ label, before: before || null, after });
}

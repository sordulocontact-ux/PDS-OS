import "server-only";

import type { DraftChange } from "@/lib/assistant/drafts";
import { foldName } from "@/lib/assistant/fuzzy-name";
import { COUNTRY_CODES, countryName } from "@/lib/catalog/countries";
import { fr } from "@/lib/i18n/fr";

// Names given by the model are matched by code against what the user can
// see (lib/assistant/fuzzy-name.ts): an unknown or ambiguous name matches
// nothing, never a guess; a corrected one is said.

export { foldName, matchByName, rankByName } from "@/lib/assistant/fuzzy-name";

/** Shown when a name was corrected, so the user can check it. */
export function understoodAs(said: string, actual: string): string | null {
  return foldName(said) === foldName(actual)
    ? null
    : fr.assistant.drafts.understoodAs(said, actual);
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

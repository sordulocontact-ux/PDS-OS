import { legal } from "@/lib/i18n/fr/legal";
import type { Clearance } from "@/lib/legal/clearance/types";

const fr = { legal };

/** What is taken, in words: « Sample de « Night Lights » (The Velvetones) ». */
export function elementLine(clearance: Clearance): string {
  const facts = fr.legal.intake.facts;
  const elements = facts.elements as Record<string, string>;
  return facts.third_party(
    elements[clearance.element] ?? elements.other,
    clearance.work,
    clearance.author,
  );
}

/** The usage recorded with the request, written by the code from what the
 * dossier knows, unless one was already recorded. */
export function usageOf(clearance: Clearance): string {
  if (clearance.usage) return clearance.usage;
  const what = elementLine(clearance);
  return clearance.title ? `${what} · « ${clearance.title} »` : what;
}

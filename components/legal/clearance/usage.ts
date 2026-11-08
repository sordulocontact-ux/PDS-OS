import { legal } from "@/lib/i18n/fr/legal";
import type { Clearance } from "@/lib/legal/clearance/types";

const fr = { legal };

/** The element in words (« Topline »), « Élément repris » when unknown. */
export function elementOf(clearance: Clearance): string {
  const elements = fr.legal.intake.facts.elements as Record<string, string>;
  return elements[clearance.element] ?? elements.other;
}

/** What is taken of which work (« Topline de « X » (auteur) »). */
export function takenOf(clearance: Clearance): string {
  return fr.legal.intake.facts.third_party(
    elementOf(clearance),
    clearance.work,
    clearance.author,
  );
}

/** The usage written by the code from what the dossier knows. */
export function usageOf(clearance: Clearance): string {
  if (clearance.usage) return clearance.usage;
  const what = takenOf(clearance);
  return clearance.title ? `${what} · « ${clearance.title} »` : what;
}

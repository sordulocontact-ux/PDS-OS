// Where an activation's figure is read (recette of 23/10, MKT-ACT-002 and
// ACT-001): the platforms of its lever, the first one proposed. A playlist
// pitch reads music platforms, a showcase its ticketing or its count, a
// content or an influence the networks; never TikTok by default elsewhere.
// Pure, client-safe.

import type { ActivationKind } from "@/lib/activations/model";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationJourney.snapshot;

export type MeasureSet = keyof typeof t.platformSets;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function measureSetOf(kind: ActivationKind, title: string): MeasureSet {
  if (/playlist|pitch|streaming/.test(normalize(title))) return "music";
  if (kind === "event") return "event";
  if (kind === "press") return "press";
  if (kind === "content" || kind === "influence") return "social";
  return "other";
}

/** The field's label and its choices, the first one preselected. */
export function measureChoices(kind: ActivationKind, title: string) {
  const set = measureSetOf(kind, title);
  return {
    label: set === "event" ? t.measure : t.platform,
    platforms: [...t.platformSets[set]],
  };
}

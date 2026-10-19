// The activation kind proposed for a lever, read in its words. Pure,
// client-safe: the « À rattacher » list and the Brief's execution plan.

import type { ActivationKind } from "@/lib/activations/model";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** A lever's kind, read in its words (« Influence », « Relations presse »,
 * « Live / showcase »…); anything else is « Autre ». */
export function kindOfLever(label: string): ActivationKind {
  const l = normalize(label);
  if (/influen/.test(l)) return "influence";
  if (/(presse|press|media|rp\b|relations)/.test(l)) return "press";
  if (/(live|showcase|session|concert|evenement|event)/.test(l)) return "event";
  if (/(clip|video|contenu|content|capsule|social|organique|reseaux)/.test(l))
    return "content";
  return "other";
}

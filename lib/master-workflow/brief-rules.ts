// What the Brief still lacks and where a designation comes from (proto
// `master-v2.html`, VISION-UX rules 2 and 22). Pure and client-safe: said
// by code, never by PO.

import { masterBrief } from "@/lib/i18n/fr/master-brief";

import type { MasterBrief } from "./brief-types";

const fr = { masterBrief };

const t = fr.masterBrief.missing;

/** « l'ingénieur du mix », « la direction artistique »… in this order. */
export function briefMissing(brief: MasterBrief): string[] {
  return [
    // A contact of the Réseau, or a member of PDS (in-house engineer).
    ...(brief.mixContactId || brief.mixPersonId ? [] : [t.mix]),
    ...(!brief.masteringSameEngineer &&
    !brief.masteringContactId &&
    !brief.masteringPersonId
      ? [t.mastering]
      : []),
    ...(brief.direction || brief.references || brief.constraints
      ? []
      : [t.direction]),
  ];
}

/** Where a designation comes from: the Cadrage › Équipe (with the words
 * said), the title's credits, the project's owner, or a choice in the
 * Brief (« Choisi par … »). */
export type BriefDesignation = {
  kind: "framing" | "credited" | "owner" | "chosen";
  quote: string | null;
  label: string | null;
};

export type BriefState = "incomplete" | "draft" | "ready";

export const briefStateOf = (
  missing: readonly string[],
  recorded: boolean,
  dirty: boolean,
): BriefState =>
  missing.length > 0 ? "incomplete" : recorded && !dirty ? "ready" : "draft";

/** « Il manque l'ingénieur du mix, la direction artistique. » */
export const missingSentence = (missing: readonly string[]) =>
  missing.length ? fr.masterBrief.missingSentence(missing.join(", ")) : null;

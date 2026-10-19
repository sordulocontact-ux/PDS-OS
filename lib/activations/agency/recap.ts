// « Récapitulatif pour <agence> » (proto agRecapText, agencySection): the
// message written by code from the PDS decisions — never the internal notes
// —, shown once a decision is newer than the last recap sent. Client-safe.

import type { AgencyRowRecord } from "@/lib/activations/agency/queries";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationBrief.recap;

const DECISIONS = Object.keys(t.sections) as (keyof typeof t.sections)[];

/** The row as the agency knows it: « Jade Cormier (@jadecrm) », a media. */
function rowName(r: AgencyRowRecord): string {
  const c = r.current;
  const name = String(c.name ?? c.media ?? c.journalist ?? "").trim();
  const handle = c.handle ? `@${String(c.handle).replace(/^@/, "")}` : "";
  if (name && handle) return `${name} (${handle})`;
  return name || handle || r.rowKey;
}

/** The latest recap declared sent, else null. */
export const lastRecapAt = (sent: readonly (string | null)[]) =>
  sent
    .filter((x): x is string => Boolean(x))
    .sort()
    .at(-1) ?? null;

/** A decision taken after the last recap sent waits for one (proto
 * `decSeq > recapSeq`). */
export function recapPending(
  rows: readonly AgencyRowRecord[],
  lastSent: string | null,
): boolean {
  return rows.some(
    (r) =>
      !r.absentSince &&
      r.decidedAt !== null &&
      r.pdsDecision !== "to_review" &&
      (!lastSent || r.decidedAt > lastSent),
  );
}

export function agencyRecapText(input: {
  rows: readonly AgencyRowRecord[];
  // « Jeanne Roussel »: the agency's contact, greeted by her first name.
  contact: string | null;
  press: boolean;
  title: string;
  artist: string;
  owner: string;
}): string {
  const live = input.rows.filter((r) => !r.absentSince);
  const parts = DECISIONS.flatMap((d) => {
    const names = live.filter((r) => r.pdsDecision === d).map(rowName);
    return names.length ? [`${t.sections[d]} : ${names.join(", ")}.`] : [];
  });
  const first = input.contact?.trim().split(/\s+/)[0] ?? null;
  return [
    t.greeting(first),
    "",
    t.intro(
      input.press ? t.what.press : t.what.influence,
      input.title,
      input.artist,
    ),
    ...parts,
    "",
    t.thanks(input.owner),
  ].join("\n");
}

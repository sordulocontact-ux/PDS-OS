// What the Brief créatif lacks before a version is made (MKT-C2-12), by an
// explicit rule — computed by code, said before « Créer la V1 »:
// - blocking: no confirmed answer at all for the release's direction (a
//   dossier without direction is not a dossier): the version is refused;
// - reserved: included, but said as not settled — the direction not
//   confirmed as a whole, a deliverable without its four answers, a
//   proposal of PO still waiting, a deliverable without a validated sheet;
// - excluded: needs still to qualify, left out of the dossier.
// Client-safe.

import type { ConceptionData } from "@/lib/design/conception";
import { DESIGN_TOPICS } from "@/lib/design/intentions";
import type { SheetStatus } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";

export type BriefChecks = {
  blocking: string[];
  reserved: string[];
  excluded: string[];
};

export function briefChecks(
  data: Pick<ConceptionData, "intentions" | "deliverables">,
  directionConfirmed: boolean,
  sheets: Array<{ deliverableId: string; status: SheetStatus }>,
): BriefChecks {
  const t = fr.conceptionDirection.brief.checks;
  const directionAnswers = data.intentions.filter(
    (i) => i.target === "direction" && i.status === "confirmed",
  ).length;
  const blocking = directionAnswers === 0 ? [t.noDirection] : [];
  const reserved: string[] = [];
  if (directionAnswers > 0 && !directionConfirmed)
    reserved.push(t.directionNotConfirmed);
  const proposals = data.intentions.filter(
    (i) => i.status === "proposed",
  ).length;
  if (proposals > 0) reserved.push(t.proposals(proposals));
  for (const d of data.deliverables.filter((x) => x.status === "confirmed")) {
    if (d.answered + d.inherited < DESIGN_TOPICS.length)
      reserved.push(t.incomplete(d.title));
    const sheet = sheets.find((s) => s.deliverableId === d.id);
    if (
      !sheet ||
      (sheet.status !== "ready_for_production" &&
        sheet.status !== "transferred")
    )
      reserved.push(t.sheetNotValidated(d.title));
  }
  return {
    blocking,
    reserved,
    excluded: data.deliverables
      .filter((d) => d.status !== "confirmed")
      .map((d) => t.excluded(d.title)),
  };
}

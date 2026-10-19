// « Déjà fait » at the bottom of a démarche's step (docs/VISION-UX.md § 4):
// the events of the dossier's journal (lib/legal/history) that belong to
// its objects — the person's fiche and contract, the borrowing, the title's
// split, the bulletin — and to its plan items, oldest first. Pure.

import type { Demarche } from "@/lib/legal/demarches/build";
import type { LegalEvent } from "@/lib/legal/history/types";

// The shape StepHistory reads (components/shell/journey/step-history.tsx).
type HistoryLine = {
  key: string;
  text: string;
  who: string | null;
  at: string;
};

export function demarcheHistory(
  demarche: Demarche,
  events: LegalEvent[],
): HistoryLine[] {
  const objects = new Set(demarche.items.map((i) => `plan-item:${i.id}`));
  let splitOf: string | null = null;
  for (const part of demarche.parts) {
    const p = part.panel;
    if (p.kind === "fiche" && p.row.formId) objects.add(`form:${p.row.formId}`);
    if (p.kind === "contract" && p.row.contract)
      objects.add(`contract:${p.row.contract.id}`);
    if (p.kind === "clearance") objects.add(`clearance:${p.clearance.id}`);
    if (p.kind === "sacem" && p.title.formality)
      objects.add(`formality:${p.title.formality.id}`);
    if (p.kind === "split") splitOf = p.split.title;
  }
  return events
    .filter(
      (e) =>
        (e.object !== null && objects.has(e.object)) ||
        (splitOf !== null &&
          e.branch === "splits" &&
          (e.subject ?? "").startsWith(splitOf)),
    )
    .reverse()
    .map((e) => ({
      key: e.id,
      text: e.action,
      who: e.by,
      at: e.at,
    }));
}

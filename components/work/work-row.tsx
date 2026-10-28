import { StatusBadge } from "@/components/ui/status-badge";
import { assistant } from "@/lib/i18n/fr/assistant";
import { shell } from "@/lib/i18n/fr/shell";
import { transmission } from "@/lib/i18n/fr/transmission";
import { work } from "@/lib/i18n/fr/work";
import { myValidationTone, projectStatusTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import type { WorkRow } from "@/lib/work/rows";

const fr = { assistant, shell, transmission, work };

const t = fr.work.table;

/** The action, as the code wrote it or as the page words its kind. */
export const titleOf = (row: WorkRow) =>
  row.title ??
  (row.kind in t.titles ? t.titles[row.kind as keyof typeof t.titles] : "");

/** Its workflow, as the project's sidebar names it: « Master ». */
export const moduleOf = (row: WorkRow) =>
  row.module ? fr.shell.project.sidebar[row.module] : null;

/** Where in it: « Mixage », « Production › Pochette », an artist, « Tâche ». */
export const placeOf = (row: WorkRow) =>
  row.place ??
  (row.kind === "task" || row.kind === "deliverable"
    ? t.places[row.kind]
    : null);

/** « Néons · Master › Mixage · avant le Dim. 15/11/2026 ». */
export function whereOf(row: WorkRow): string {
  return [
    row.projectTitle,
    [moduleOf(row), placeOf(row)].filter(Boolean).join(" › "),
    row.due ? fr.work.lead.due(formatDay(row.due)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** What the row asks, when its group does not say it already: a decision,
 * PO's proposals, where a handed-over project stands. */
export function rowBadge(row: WorkRow): React.ReactNode {
  if (row.kind === "validate")
    return (
      <StatusBadge tone={myValidationTone} size="sm">
        {fr.work.journeys.toValidate}
      </StatusBadge>
    );
  if (row.kind === "proposals" && row.proposalCount !== undefined)
    return (
      <StatusBadge tone="warning" size="sm">
        {fr.assistant.cards.proposalsCount(row.proposalCount)}
      </StatusBadge>
    );
  if (row.projectStatus)
    return (
      <StatusBadge tone={projectStatusTone[row.projectStatus]} size="sm">
        {fr.transmission.statuses[
          row.projectStatus as keyof typeof fr.transmission.statuses
        ] ?? row.projectStatus}
      </StatusBadge>
    );
  return null;
}

import { LinkRow } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { assistant } from "@/lib/i18n/fr/assistant";
import { transmission } from "@/lib/i18n/fr/transmission";
import { work } from "@/lib/i18n/fr/work";
import { myValidationTone, projectStatusTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import type { WorkRow } from "@/lib/work/rows";

const fr = { assistant, transmission, work };

const t = fr.work.table;

/** The action, as the code wrote it or as the page words its kind. */
export const titleOf = (row: WorkRow) =>
  row.title ??
  (row.kind in t.titles ? t.titles[row.kind as keyof typeof t.titles] : "");

/** « Néons · Master › Mixage · avant le Dim. 15/11/2026 ». */
export function whereOf(row: WorkRow): string {
  const place =
    row.place ??
    (row.kind === "task" || row.kind === "deliverable"
      ? t.places[row.kind]
      : null);
  return [
    row.projectTitle,
    place,
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

/** One action of the Travail: what to do, where and for when; the row opens
 * the gesture (`actionHref`), never the top of the project. */
export function WorkRowLink({ row }: { row: WorkRow }) {
  return (
    <LinkRow
      href={row.href}
      title={titleOf(row)}
      detail={whereOf(row)}
      badge={rowBadge(row)}
    />
  );
}

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { assistant } from "@/lib/i18n/fr/assistant";
import { transmission } from "@/lib/i18n/fr/transmission";
import { work } from "@/lib/i18n/fr/work";
import {
  myValidationTone,
  overdueTone,
  projectStatusTone,
  workStatusTone,
} from "@/lib/ui/state-tones";
import { formatShortDay } from "@/lib/utils/day";
import type { WorkRow } from "@/lib/work/rows";

const fr = { assistant, transmission, work };

const t = fr.work.table;

// On a phone the state keeps only its badge's width: the action needs the rest.
const STATE_COLUMN = "w-px whitespace-nowrap sm:w-48";

// The row's state: late first, then what the row asks for.
function RowState({ row }: { row: WorkRow }) {
  if (row.overdue)
    return (
      <StatusBadge tone={overdueTone} size="sm">
        {fr.work.journeys.overdue}
      </StatusBadge>
    );
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
  return (
    <StatusBadge tone={workStatusTone.todo} size="sm">
      {t.todo}
    </StatusBadge>
  );
}

const titleOf = (row: WorkRow) =>
  row.title ??
  (row.kind in t.titles ? t.titles[row.kind as keyof typeof t.titles] : "");

const placeOf = (row: WorkRow) =>
  row.place ??
  (row.kind === "task" || row.kind === "deliverable"
    ? t.places[row.kind]
    : null);

/** The global Travail's list, in the design of every list page (DataTable):
 * the action and where it is, its project, its due date, its state. */
export function WorkTable({ rows }: { rows: WorkRow[] }) {
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.action}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.project}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.due}</DataTableHead>
        <DataTableHead className={STATE_COLUMN}>
          {t.columns.state}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row) => (
          <DataTableRow key={row.key}>
            <DataTableCell fill className="max-w-0">
              <DataTableMedia
                title={
                  <DataTableLink href={row.href}>{titleOf(row)}</DataTableLink>
                }
                subtitle={
                  // The project shows here once its column is hidden.
                  <>
                    <span className="md:hidden">
                      {[row.projectTitle, placeOf(row)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {placeOf(row) && (
                      <span className="hidden md:inline">{placeOf(row)}</span>
                    )}
                  </>
                }
              />
            </DataTableCell>
            <DataTableCell hideBelow="md">
              <span className="block truncate">{row.projectTitle}</span>
            </DataTableCell>
            <DataTableCell
              hideBelow="sm"
              className={
                row.due ? undefined : "text-[color:var(--text-secondary)]"
              }
            >
              {row.due ? formatShortDay(row.due, { bare: true }) : t.noDue}
            </DataTableCell>
            <DataTableCell className={STATE_COLUMN}>
              <RowState row={row} />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}

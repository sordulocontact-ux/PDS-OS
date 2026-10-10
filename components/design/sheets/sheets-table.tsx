import { CreateSheetButton } from "@/components/design/sheets/create-sheet-button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { routes } from "@/lib/auth/redirects";
import type { SheetStatus } from "@/lib/design/states";
import { fr } from "@/lib/i18n/fr";
import { designReviewTone } from "@/lib/ui/state-tones";

export type SheetsTableRow = {
  deliverableId: string;
  deliverableTitle: string;
  // Quantity the Stratégie committed to, if more than one.
  planned: number | null;
  sheet: {
    id: string;
    title: string;
    kind: string;
    items: number;
    status: SheetStatus;
    responsible: string | null;
    deliveryDate: string | null;
  } | null;
};

/**
 * One line per deliverable of the Conception: its Fiche Livrable (status
 * computed by code, responsible, delivery) or, for the chef de projet,
 * « Créer la fiche ». Sheets move on independently of each other.
 */
export function SheetsTable({
  projectId,
  rows,
  canCreate,
}: {
  projectId: string;
  rows: SheetsTableRow[];
  canCreate: boolean;
}) {
  const t = fr.conceptionSheet;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.deliverable}</DataTableHead>
        <DataTableHead>{t.columns.status}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.responsible}</DataTableHead>
        <DataTableHead hideBelow="lg">{t.columns.delivery}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row) => {
          const sheet = row.sheet;
          return (
            <DataTableRow key={row.deliverableId}>
              <DataTableCell fill>
                <DataTableMedia
                  title={
                    <DataTableLink
                      href={
                        sheet
                          ? routes.projectDesignSheet(projectId, sheet.id)
                          : null
                      }
                    >
                      {sheet?.title ?? row.deliverableTitle}
                    </DataTableLink>
                  }
                  subtitle={
                    sheet
                      ? sheet.kind === "series"
                        ? t.kinds.series(sheet.items)
                        : t.kinds.single
                      : t.noSheet
                  }
                />
              </DataTableCell>
              <DataTableCell>
                {sheet ? (
                  <StatusBadge tone={designReviewTone[sheet.status]} size="sm">
                    {fr.conception.sheetStatuses[sheet.status]}
                  </StatusBadge>
                ) : canCreate ? (
                  <CreateSheetButton
                    projectId={projectId}
                    deliverableId={row.deliverableId}
                    title={row.deliverableTitle}
                    planned={row.planned}
                  />
                ) : (
                  EMPTY_CELL
                )}
              </DataTableCell>
              <DataTableCell hideBelow="md">
                {sheet ? (sheet.responsible ?? t.noResponsible) : EMPTY_CELL}
              </DataTableCell>
              <DataTableCell hideBelow="lg" className="tabular-nums">
                {sheet?.deliveryDate
                  ? formatDay(sheet.deliveryDate)
                  : EMPTY_CELL}
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}

import { WorkflowProgress } from "@/components/projects/tracks/workflow-progress";
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
import { titleTracks } from "@/lib/i18n/fr/title-tracks";
import type { WorkflowCard } from "@/lib/overview/cards";

const fr = { titleTracks };

/** One row: a title of the collective, or the Juridique's « Projet ». */
export type ModuleScopeRow = {
  key: string;
  label: string;
  // Its guests, under its name.
  subtitle?: string | null;
  // Its step in the workflow; null: not for this viewer to open.
  href: string | null;
  card: WorkflowCard;
};

/**
 * The entry of a collective's Master or Juridique (Sacha, 28/11/2026:
 * « Master » opens the list of its titles, never a title chosen by the
 * code): one row per title — « Projet » first in the Juridique —, its ring
 * and the step it is at, « À vous » under it when the next action is the
 * viewer's (the cells of « Titres », WorkflowProgress). The name opens the
 * title's step in this workflow, the one that waits for the viewer, else
 * the one in progress. The Distribution's list is « Sorties ».
 */
export function ModuleScopesList({
  rows,
  scopeLabel = fr.titleTracks.list.columns.title,
}: {
  rows: ModuleScopeRow[];
  scopeLabel?: string;
}) {
  const t = fr.titleTracks.list;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead icon="master" className="w-1/2">
          {scopeLabel}
        </DataTableHead>
        <DataTableHead icon="step">{t.columns.step}</DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row) => (
          <DataTableRow key={row.key}>
            <DataTableCell className="w-1/2">
              <DataTableMedia
                title={
                  row.href ? (
                    <DataTableLink href={row.href}>{row.label}</DataTableLink>
                  ) : (
                    row.label
                  )
                }
                subtitle={row.subtitle ?? undefined}
              />
            </DataTableCell>
            <DataTableCell>
              <WorkflowProgress card={row.card} />
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}

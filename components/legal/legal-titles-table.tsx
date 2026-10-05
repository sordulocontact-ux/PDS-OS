import { TitleRowActions } from "@/components/legal/title-row-actions";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { LegalTitleRow, TitleIdentifier } from "@/lib/legal/types";
import { factTone } from "@/lib/ui/state-tones";

// Secondary identifiers give way first on small screens, like every list.
const COLUMNS: Array<{ key: TitleIdentifier; hideBelow?: "sm" | "md" }> = [
  { key: "isrc" },
  { key: "iswc", hideBelow: "sm" },
  { key: "rightsHolder", hideBelow: "md" },
];

/**
 * Titres of the État des lieux: one row per title (with its artists, so the
 * song is recognisable), its identifiers in columns — the value when it is
 * filled, a badge when it is still to fill. The row opens the title's page.
 */
export function LegalTitlesTable({
  titles,
  canEdit,
}: {
  titles: LegalTitleRow[];
  // manage_catalog: each row's "⋯" edits the title or its rights.
  canEdit: boolean;
}) {
  const t = fr.legal.inventory;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{fr.facts.columns.title}</DataTableHead>
        {COLUMNS.map((column) => (
          <DataTableHead key={column.key} hideBelow={column.hideBelow}>
            {t.facts[column.key]}
          </DataTableHead>
        ))}
        {canEdit && <DataTableActionsHead label={fr.facts.columns.actions} />}
      </DataTableHeader>
      <DataTableBody>
        {titles.map((row) => (
          <DataTableRow key={row.masterId}>
            <DataTableCell fill className="max-w-0">
              <DataTableMedia
                title={
                  <DataTableLink href={row.href}>{row.title}</DataTableLink>
                }
                subtitle={row.artists || null}
              />
            </DataTableCell>
            {COLUMNS.map((column) => {
              const cell = row.cells[column.key];
              return (
                <DataTableCell
                  key={column.key}
                  hideBelow={column.hideBelow}
                  className="max-w-48 truncate"
                >
                  {cell.value ?? (
                    <StatusBadge tone={factTone[cell.status]}>
                      {cell.statusLabel}
                    </StatusBadge>
                  )}
                </DataTableCell>
              );
            })}
            {canEdit && (
              <DataTableActionsCell>
                <TitleRowActions
                  masterId={row.masterId}
                  title={row.title}
                  rights={row.rights}
                />
              </DataTableActionsCell>
            )}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}

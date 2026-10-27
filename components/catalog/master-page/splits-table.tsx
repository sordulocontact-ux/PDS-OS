"use client";

import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { formatShare, type MasterSplit } from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";

import { ItemRowActions } from "./item-dialogs";

const fr = { masterPage };

/** Shares of one kind (holder, role, share) with each row's "⋯" when the
 * viewer edits: the title's Splits and the Juridique's Répartitions. */
export function SplitsTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: MasterSplit[];
  canEdit: boolean;
  onEdit: (split: MasterSplit) => void;
  onDelete: (split: MasterSplit) => void;
}) {
  const t = fr.masterPage.splits;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.party}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.role}</DataTableHead>
        <DataTableHead fill align="end">
          {t.columns.share}
        </DataTableHead>
        {canEdit && <DataTableActionsHead label={t.columns.actions} />}
      </DataTableHeader>
      <DataTableBody>
        {rows.map((split) => (
          <DataTableRow key={split.id}>
            <DataTableCell>{split.party}</DataTableCell>
            <DataTableCell hideBelow="sm">{t.roles[split.role]}</DataTableCell>
            <DataTableCell fill align="end" className="tabular-nums">
              {formatShare(split.share)}
            </DataTableCell>
            {canEdit && (
              <DataTableActionsCell>
                <ItemRowActions
                  name={split.party}
                  onEdit={() => onEdit(split)}
                  onDelete={() => onDelete(split)}
                />
              </DataTableActionsCell>
            )}
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}

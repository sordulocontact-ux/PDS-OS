"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatEuros, type BudgetLine } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { budgetStatusTone } from "@/lib/ui/state-tones";

// Budget lines with their total (code), edit and delete for the owner.
export function BudgetTable({
  lines,
  canEdit,
  onEdit,
  onDelete,
}: {
  lines: BudgetLine[];
  canEdit: boolean;
  onEdit: (line: BudgetLine) => void;
  onDelete: (line: BudgetLine) => void;
}) {
  const t = fr.budget;
  const total = lines.reduce((sum, l) => sum + l.amountCents, 0);
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.table.label}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.table.status}</DataTableHead>
        <DataTableHead align="end">{t.table.amount}</DataTableHead>
        {canEdit && (
          <DataTableHead align="end" className="w-24">
            <span className="sr-only">{t.table.actions}</span>
          </DataTableHead>
        )}
      </DataTableHeader>
      <DataTableBody>
        {lines.map((line) => (
          <DataTableRow key={line.id}>
            <DataTableCell fill>
              <DataTableMedia
                title={<span className="truncate">{line.label}</span>}
                subtitle={
                  <>
                    {[
                      line.family === "other" && line.familyDetail
                        ? `${fr.budget.families.other} : ${line.familyDetail}`
                        : line.family && fr.budget.families[line.family],
                      line.leverLabel,
                      line.deliverableTitle,
                      line.note,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {line.attachment?.url && (
                      <>
                        {" · "}
                        <a
                          href={line.attachment.url}
                          className="relative z-10 underline underline-offset-4"
                        >
                          {t.form.attachmentKept(line.attachment.name)}
                        </a>
                      </>
                    )}
                  </>
                }
              />
            </DataTableCell>
            <DataTableCell hideBelow="sm">
              <StatusBadge tone={budgetStatusTone[line.status]} size="sm">
                {t.statuses[line.status]}
              </StatusBadge>
            </DataTableCell>
            <DataTableCell align="end" className="tabular-nums">
              {formatEuros(line.amountCents)}
            </DataTableCell>
            {canEdit && (
              <DataTableCell align="end" className="w-24">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.edit(line.label)}
                    onClick={() => onEdit(line)}
                  >
                    <IconPenWriting2 aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.remove(line.label)}
                    onClick={() => onDelete(line)}
                  >
                    <IconTrash aria-hidden />
                  </Button>
                </div>
              </DataTableCell>
            )}
          </DataTableRow>
        ))}
        <DataTableRow className="border-t border-[color:var(--border-hairline)]">
          <DataTableCell fill className="font-semibold">
            {t.table.total}
          </DataTableCell>
          <DataTableCell hideBelow="sm">{null}</DataTableCell>
          <DataTableCell align="end" className="font-semibold tabular-nums">
            {formatEuros(total)}
          </DataTableCell>
          {canEdit && <DataTableCell className="w-24">{null}</DataTableCell>}
        </DataTableRow>
      </DataTableBody>
    </DataTable>
  );
}

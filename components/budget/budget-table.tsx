"use client";

import { IconPenWriting2, IconTrash } from "nucleo-sharp-essential";
import Link from "next/link";

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
import { routes } from "@/lib/auth/redirects";
import { formatEuros, lacksProof, type BudgetLine } from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";
import { budgetStatusTone, proofTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";

const fr = { budget };

// Budget lines with their total (code), edit and delete for whoever
// writes them. The one row of a spend (a project's Budget, an artist's,
// Dépenses): its day, what it belongs to when `showTarget`, a real spend
// without its proof signalled (BUD 1).
export function BudgetTable({
  lines,
  canEdit,
  onEdit,
  onDelete,
  showTarget = false,
}: {
  lines: BudgetLine[];
  canEdit: boolean | ((line: BudgetLine) => boolean);
  onEdit: (line: BudgetLine) => void;
  onDelete: (line: BudgetLine) => void;
  showTarget?: boolean;
}) {
  const writes = (line: BudgetLine) =>
    typeof canEdit === "function" ? canEdit(line) : canEdit;
  const anyWrites = lines.some(writes);
  const t = fr.budget;
  const total = lines.reduce((sum, l) => sum + l.amountCents, 0);
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.table.label}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.table.status}</DataTableHead>
        <DataTableHead align="end">{t.table.amount}</DataTableHead>
        {anyWrites && (
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
                title={
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{line.label}</span>
                    {lacksProof(line) && (
                      <StatusBadge tone={proofTone.to_provide} size="sm">
                        {t.noProof}
                      </StatusBadge>
                    )}
                  </span>
                }
                subtitle={
                  <>
                    {formatDay(line.spentOn)}
                    {/* What it belongs to, a link to its budget (UX test
                        of 12/11/2026: the name led nowhere). */}
                    {showTarget && line.targetLabel && (
                      <>
                        {" · "}
                        <Link
                          href={
                            line.target.kind === "artist"
                              ? routes.artistBudget(line.target.id)
                              : routes.projectBudget(line.target.id)
                          }
                          className="relative z-10 underline-offset-4 hover:underline focus-visible:underline"
                        >
                          {line.targetLabel}
                        </Link>
                      </>
                    )}
                    {[
                      "",
                      line.family === "other" && line.familyDetail
                        ? `${fr.budget.families.other} : ${line.familyDetail}`
                        : line.family && fr.budget.families[line.family],
                      line.leverLabel,
                      line.deliverableTitle,
                      line.note,
                      line.committedCents !== null
                        ? t.committedWas(formatEuros(line.committedCents))
                        : null,
                    ]
                      .filter((part, i) => i === 0 || Boolean(part))
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
            {anyWrites && (
              <DataTableCell align="end" className="w-24">
                {writes(line) && (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.edit(line.label)}
                      onClick={() => onEdit(line)}
                    >
                      <IconPenWriting2 aria-hidden />
                    </Button>
                    {!line.invoiceId && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t.remove(line.label)}
                        onClick={() => onDelete(line)}
                      >
                        <IconTrash aria-hidden />
                      </Button>
                    )}
                  </div>
                )}
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
          {anyWrites && <DataTableCell className="w-24">{null}</DataTableCell>}
        </DataTableRow>
      </DataTableBody>
    </DataTable>
  );
}

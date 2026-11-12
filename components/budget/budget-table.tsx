"use client";

import {
  IconPaperclip,
  IconPenWriting2,
  IconTrash,
} from "nucleo-sharp-essential";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { formatEuros, lacksProof, type BudgetLine } from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";
import { budgetStatusTone, proofTone } from "@/lib/ui/state-tones";
import { formatDay } from "@/lib/utils/day";
import { cn } from "@/lib/utils";

const fr = { budget };

const linkClass =
  "relative z-10 underline-offset-4 hover:underline focus-visible:underline";

/** A line's poste, « Autre : … » with what it is. */
function familyOf(line: BudgetLine): string | null {
  if (line.family === "other" && line.familyDetail)
    return `${fr.budget.families.other} : ${line.familyDetail}`;
  return line.family ? fr.budget.families[line.family] : null;
}

// Budget lines with their total (code), edit and delete for whoever
// writes them. The one table of the spends (a project's Budget, an
// artist's, Dépenses), one fact per column (Sacha, 12/11/2026: never two
// lines of facts under the label): its day, the spend (a real one without
// its proof signalled, BUD 1), its poste, what it belongs to when
// `showTarget` (a link to its budget), what it is linked to (a lever or a
// deliverable of the Stratégie, when any line has one), its state, its
// amount. The note and the amount committed before an invoice are read in
// the line's form; its proof opens from the paperclip.
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
  const anyProof = lines.some((line) => line.attachment?.url);
  const actions = anyWrites || anyProof;
  const linked = lines.some((line) => line.deliverableTitle || line.leverLabel);
  const t = fr.budget;
  const total = lines.reduce((sum, l) => sum + l.amountCents, 0);
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead hideBelow="sm" className="w-28">
          {t.table.date}
        </DataTableHead>
        <DataTableHead fill>{t.table.label}</DataTableHead>
        <DataTableHead hideBelow="md" fill>
          {t.table.family}
        </DataTableHead>
        {showTarget && (
          <DataTableHead hideBelow="md" fill>
            {t.table.target}
          </DataTableHead>
        )}
        {linked && (
          <DataTableHead hideBelow="lg" fill>
            {t.table.linkedTo}
          </DataTableHead>
        )}
        <DataTableHead hideBelow="sm" className="w-32">
          {t.table.status}
        </DataTableHead>
        <DataTableHead align="end" className="w-32">
          {t.table.amount}
        </DataTableHead>
        {actions && (
          <DataTableHead align="end" className="w-28">
            <span className="sr-only">{t.table.actions}</span>
          </DataTableHead>
        )}
      </DataTableHeader>
      <DataTableBody>
        {lines.map((line) => (
          <DataTableRow key={line.id}>
            <DataTableCell hideBelow="sm" className="w-28 tabular-nums">
              {formatDay(line.spentOn)}
            </DataTableCell>
            <DataTableCell fill>
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{line.label}</span>
                {lacksProof(line) && (
                  <StatusBadge tone={proofTone.to_provide} size="sm">
                    {t.noProof}
                  </StatusBadge>
                )}
              </span>
            </DataTableCell>
            <DataTableCell hideBelow="md" fill>
              {familyOf(line) ?? EMPTY_CELL}
            </DataTableCell>
            {showTarget && (
              <DataTableCell hideBelow="md" fill>
                {line.targetLabel ? (
                  // A link to its budget (UX test of 12/11/2026).
                  <Link
                    href={
                      line.target.kind === "artist"
                        ? routes.artistBudget(line.target.id)
                        : routes.projectBudget(line.target.id)
                    }
                    className={linkClass}
                  >
                    {line.targetLabel}
                  </Link>
                ) : (
                  EMPTY_CELL
                )}
              </DataTableCell>
            )}
            {linked && (
              <DataTableCell hideBelow="lg" fill>
                {line.deliverableTitle ?? line.leverLabel ?? EMPTY_CELL}
              </DataTableCell>
            )}
            <DataTableCell hideBelow="sm" className="w-32">
              <StatusBadge tone={budgetStatusTone[line.status]} size="sm">
                {t.statuses[line.status]}
              </StatusBadge>
            </DataTableCell>
            <DataTableCell align="end" className="w-32 tabular-nums">
              {formatEuros(line.amountCents)}
            </DataTableCell>
            {actions && (
              <DataTableCell align="end" className="w-28">
                <div className="flex justify-end gap-1">
                  {line.attachment?.url && (
                    <a
                      href={line.attachment.url}
                      aria-label={t.table.proof(line.attachment.name)}
                      title={t.form.attachmentKept(line.attachment.name)}
                      className={cn(
                        "relative z-10",
                        buttonVariants({ variant: "ghost", size: "icon-sm" }),
                      )}
                    >
                      <IconPaperclip aria-hidden />
                    </a>
                  )}
                  {writes(line) && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.edit(line.label)}
                      onClick={() => onEdit(line)}
                    >
                      <IconPenWriting2 aria-hidden />
                    </Button>
                  )}
                  {writes(line) && !line.invoiceId && (
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
              </DataTableCell>
            )}
          </DataTableRow>
        ))}
        <DataTableRow className="border-t border-[color:var(--border-hairline)]">
          <DataTableCell hideBelow="sm" className="w-28">
            {null}
          </DataTableCell>
          <DataTableCell fill className="font-semibold">
            {t.table.total}
          </DataTableCell>
          <DataTableCell hideBelow="md" fill>
            {null}
          </DataTableCell>
          {showTarget && (
            <DataTableCell hideBelow="md" fill>
              {null}
            </DataTableCell>
          )}
          {linked && (
            <DataTableCell hideBelow="lg" fill>
              {null}
            </DataTableCell>
          )}
          <DataTableCell hideBelow="sm" className="w-32">
            {null}
          </DataTableCell>
          <DataTableCell
            align="end"
            className="w-32 font-semibold tabular-nums"
          >
            {formatEuros(total)}
          </DataTableCell>
          {actions && <DataTableCell className="w-28">{null}</DataTableCell>}
        </DataTableRow>
      </DataTableBody>
    </DataTable>
  );
}

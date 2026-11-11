"use client";

import { IconMoneyBillCoin, IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { BudgetLineSheet } from "@/components/budget/budget-line-sheet";
import { BudgetTable } from "@/components/budget/budget-table";
import { DeleteBudgetLineDialog } from "@/components/budget/delete-budget-line-dialog";
import { useCanEditProject } from "@/components/projects/edit-access";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { DataTableViews } from "@/components/ui/data-table";
import {
  type BudgetDeliverable,
  BUDGET_STATUSES,
  type BudgetLever,
  type BudgetLine,
  type BudgetStatus,
  type BudgetTarget,
  lacksProof,
} from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";

const fr = { budget };

// The lines, filtered in place by status (tabs with their counts). Whoever
// writes adds, edits and deletes: a project's owner (its edit access), an
// artist's budget readers (`canEdit`); the others read (the database
// refuses them anyway).
export function BudgetLines({
  target,
  lines,
  levers = [],
  deliverables,
  organizationId,
  canEdit: canEditTarget,
}: {
  target: BudgetTarget;
  lines: BudgetLine[];
  levers?: BudgetLever[];
  deliverables?: BudgetDeliverable[];
  organizationId?: string | null;
  // Outside a project (an artist's Budget): who writes, said by the page.
  canEdit?: boolean;
}) {
  const t = fr.budget;
  const projectEdit = useCanEditProject();
  const canEdit = canEditTarget ?? projectEdit;
  // A status, or the real spends without their proof (BUD 1).
  const [filter, setFilter] = useState<BudgetStatus | "no_proof" | null>(null);
  const unproved = lines.filter(lacksProof);
  const isOwn = (line: BudgetLine) =>
    line.target.kind === target.kind && line.target.id === target.id;
  const [editing, setEditing] = useState<BudgetLine | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState<BudgetLine | null>(null);

  const shown =
    filter === "no_proof"
      ? unproved
      : filter
        ? lines.filter((l) => l.status === filter)
        : lines;
  const openSheet = (line: BudgetLine | null) => {
    setEditing(line);
    setSheetOpen(true);
  };

  const addButton = canEdit && (
    <Button size="lg" onClick={() => openSheet(null)}>
      <IconPlus aria-hidden data-icon="inline-start" />
      {t.add}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {lines.length === 0 ? (
        <EmptyState
          icon={IconMoneyBillCoin}
          title={t.empty.title}
          body={canEdit ? t.empty.body : t.empty.bodyReadOnly}
          action={addButton || undefined}
        />
      ) : (
        <DataTableViews
          label={t.filters.label}
          views={[
            {
              label: t.filters.all,
              count: lines.length,
              current: filter === null,
              onSelect: () => setFilter(null),
            },
            ...BUDGET_STATUSES.map((status) => ({
              label: t.statuses[status],
              count: lines.filter((l) => l.status === status).length,
              current: filter === status,
              onSelect: () => setFilter(status),
            })),
            ...(unproved.length > 0 || filter === "no_proof"
              ? [
                  {
                    label: t.noProof,
                    count: unproved.length,
                    current: filter === "no_proof",
                    onSelect: () => setFilter("no_proof"),
                  },
                ]
              : []),
          ]}
          action={addButton}
        >
          {shown.length === 0 ? (
            <p className="text-body-md text-muted-foreground">
              {t.table.filteredEmpty}
            </p>
          ) : (
            <BudgetTable
              lines={shown}
              // Written here: the lines of this page's project or artist
              // (an artist's tab also reads its projects' lines).
              canEdit={(line) => canEdit && isOwn(line)}
              showTarget={lines.some((line) => !isOwn(line))}
              onEdit={openSheet}
              onDelete={setDeleting}
            />
          )}
        </DataTableViews>
      )}

      <BudgetLineSheet
        target={target}
        line={editing}
        levers={levers}
        deliverables={deliverables}
        organizationId={organizationId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
      <DeleteBudgetLineDialog
        line={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

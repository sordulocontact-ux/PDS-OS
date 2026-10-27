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
} from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";

const fr = { budget };

// The lines, filtered in place by status (tabs with their counts). The owner adds, edits and deletes; the
// others read (the database refuses them anyway).
export function BudgetLines({
  projectId,
  lines,
  levers,
  deliverables,
  organizationId,
}: {
  projectId: string;
  lines: BudgetLine[];
  levers: BudgetLever[];
  deliverables?: BudgetDeliverable[];
  organizationId?: string | null;
}) {
  const t = fr.budget;
  const canEdit = useCanEditProject();
  const [filter, setFilter] = useState<BudgetStatus | null>(null);
  const [editing, setEditing] = useState<BudgetLine | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState<BudgetLine | null>(null);

  const shown = filter ? lines.filter((l) => l.status === filter) : lines;
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
              canEdit={canEdit}
              onEdit={openSheet}
              onDelete={setDeleting}
            />
          )}
        </DataTableViews>
      )}

      <BudgetLineSheet
        projectId={projectId}
        line={editing}
        levers={levers}
        deliverables={deliverables}
        organizationId={organizationId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
      <DeleteBudgetLineDialog
        projectId={projectId}
        line={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

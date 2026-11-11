"use client";

import { BudgetTable } from "@/components/budget/budget-table";
import { useBudgetLineDialogs } from "@/components/budget/use-budget-line-dialogs";
import { SearchableList } from "@/components/ui/searchable-list";
import type { Expense } from "@/lib/budget/expenses-queries";
import { budget } from "@/lib/i18n/fr/budget";
import { expenses } from "@/lib/i18n/fr/expenses";

const fr = { budget, expenses };

/**
 * The spends of the Dépenses page (BUD 3): an instant search over the
 * label, what it belongs to, its artist and poste, the page's filters on
 * the same line; the same row as every Budget, editable where the reader
 * writes it.
 */
export function ExpensesList({
  rows,
  filters,
  empty,
  organizationId,
}: {
  rows: Expense[];
  filters: React.ReactNode;
  empty?: React.ReactNode;
  organizationId: string | null;
}) {
  const t = fr.expenses.search;
  const dialogs = useBudgetLineDialogs({ target: null, organizationId });
  const writable = new Set(rows.filter((r) => r.writable).map((r) => r.id));
  return (
    <>
      <SearchableList
        items={rows}
        searchText={(row) => [
          row.label,
          row.targetLabel,
          row.artistName,
          row.family && fr.budget.families[row.family],
          row.familyDetail,
          row.note,
        ]}
        label={t.label}
        placeholder={t.placeholder}
        noResult={t.noResult}
        filters={filters}
        empty={empty}
      >
        {(visible) => (
          <BudgetTable
            lines={visible}
            canEdit={(line) => writable.has(line.id)}
            showTarget
            onEdit={dialogs.edit}
            onDelete={dialogs.remove}
          />
        )}
      </SearchableList>
      {dialogs.dialogs}
    </>
  );
}

"use client";

import { IncomeForm } from "@/components/finance/income-form";
import { QuickExpenseDialog } from "@/components/budget/quick-expense-button";
import { FormDialog } from "@/components/ui/form-dialog";
import type { FinancePulse } from "@/lib/finance/search-actions";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { treasury } from "@/lib/i18n/fr/treasury";

/**
 * The forms Finance's ⌘K opens from its two first rows (« Ajouter une
 * dépense », « Ajouter une entrée »): the same forms as the pages' « + »,
 * in the right panel, over the page one is on.
 */
export function SearchAdd({
  adding,
  add,
  onClose,
}: {
  adding: "spend" | "income" | null;
  add: FinancePulse["add"];
  onClose: () => void;
}) {
  return (
    <>
      <QuickExpenseDialog
        open={adding === "spend"}
        onOpenChange={(next) => !next && onClose()}
      />
      {add && (
        <FormDialog
          open={adding === "income"}
          onOpenChange={(next) => !next && onClose()}
          title={treasury.incomeForm.newTitle}
          closeLabel={dialogs.close}
          size="medium"
        >
          <IncomeForm
            income={null}
            targets={add.targets}
            organizationId={add.organizationId}
            ownerId={add.ownerId}
            onDone={onClose}
          />
        </FormDialog>
      )}
    </>
  );
}

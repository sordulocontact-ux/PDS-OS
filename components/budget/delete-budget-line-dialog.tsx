"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { deleteBudgetLine } from "@/lib/budget/actions";
import type { BudgetLine } from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";

const fr = { budget };

// Confirms a definitive deletion; stays open if it fails, with the error.
export function DeleteBudgetLineDialog({
  line,
  onClose,
}: {
  line: BudgetLine | null;
  onClose: () => void;
}) {
  const t = fr.budget.confirm;
  const { pending, run, error, setError } = useWriteSubmit(onClose, t.deleted);
  const clearError = () => setError(null);

  function confirm() {
    if (!line) return;
    run(() => deleteBudgetLine(line.target, line.id));
  }

  return (
    <ConfirmDialog
      open={line !== null}
      onOpenChange={(open) => {
        if (open) return;
        clearError();
        onClose();
      }}
      title={t.title}
      description={line ? t.body(line.label) : ""}
      cancelLabel={fr.budget.form.cancel}
      closeLabel={fr.budget.form.close}
      confirmLabel={t.confirm}
      pendingLabel={t.deleting}
      pending={pending}
      destructive
      error={error}
      onConfirm={confirm}
    />
  );
}

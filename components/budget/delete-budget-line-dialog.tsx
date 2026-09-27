"use client";

import { toast } from "sonner";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteBudgetLine } from "@/lib/budget/actions";
import type { BudgetLine } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";

// Confirms a definitive deletion; stays open if it fails (error in a toast).
export function DeleteBudgetLineDialog({
  projectId,
  line,
  onClose,
}: {
  projectId: string;
  line: BudgetLine | null;
  onClose: () => void;
}) {
  const t = fr.budget.confirm;
  const { pending, run } = useFramingAction();

  function confirm() {
    if (!line) return;
    run(
      () => deleteBudgetLine(projectId, line.id),
      () => {
        toast.success(t.deleted);
        onClose();
      },
    );
  }

  return (
    <ConfirmDialog
      open={line !== null}
      onOpenChange={(open) => !open && onClose()}
      title={t.title}
      description={line ? t.body(line.label) : ""}
      cancelLabel={fr.budget.form.cancel}
      closeLabel={fr.budget.form.close}
      confirmLabel={t.confirm}
      pendingLabel={t.deleting}
      pending={pending}
      destructive
      onConfirm={confirm}
    />
  );
}

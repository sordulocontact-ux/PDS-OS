"use client";

import { toast } from "sonner";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={line !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent closeLabel={fr.budget.form.close}>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>
            {line ? t.body(line.label) : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="lg" onClick={onClose}>
            {fr.budget.form.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={confirm}
          >
            {pending ? t.deleting : t.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

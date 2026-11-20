"use client";

import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { routes } from "@/lib/auth/redirects";
import { removeBudget } from "@/lib/finance/budget-envelope-actions";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";

const fr = { dialogs, financeBudgets };

/**
 * « Supprimer le budget » of a budget made by hand (never a project's or an
 * artist's): deleted when nothing uses it, archived when a spend does; the
 * list is where the page goes next, the budget being gone from it.
 */
export function RemoveBudgetDialog({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const t = fr.financeBudgets.removeBudget;
  const router = useRouter();
  const submit = useWriteSubmit(() => router.push(routes.financeBudgets), "");
  return (
    <ConfirmDialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={t.title}
      description={t.body}
      cancelLabel={fr.dialogs.cancel}
      closeLabel={fr.dialogs.close}
      confirmLabel={t.confirm}
      pendingLabel={t.pending}
      pending={submit.pending}
      error={submit.error}
      destructive
      onConfirm={() => submit.run(() => removeBudget(id))}
    />
  );
}

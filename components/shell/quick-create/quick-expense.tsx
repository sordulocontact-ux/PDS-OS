"use client";

import { usePathname } from "next/navigation";

import { QuickExpenseDialog } from "@/components/budget/quick-expense-button";

// /app/projects/<id>/…: the project the reader is on.
const PROJECT_PATH = /^\/app\/projects\/([0-9a-f-]{36})(?:\/|$)/i;

/** « Ajouter une dépense »: the quick spend's form, on the project of the
 * page when the reader may aim at it. */
export function QuickExpense({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const projectId = PROJECT_PATH.exec(usePathname())?.[1];
  return (
    <QuickExpenseDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      preferredProjectId={projectId}
    />
  );
}

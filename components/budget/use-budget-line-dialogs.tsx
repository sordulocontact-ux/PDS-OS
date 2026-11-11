"use client";

import { useState } from "react";

import { BudgetLineSheet } from "@/components/budget/budget-line-sheet";
import { DeleteBudgetLineDialog } from "@/components/budget/delete-budget-line-dialog";
import type {
  BudgetDeliverable,
  BudgetLever,
  BudgetLine,
  BudgetTarget,
} from "@/lib/budget/types";

/**
 * The dialogs of a list of spends (a project's Budget, an artist's,
 * Dépenses): « Modifier » opens the line's form for what it belongs to,
 * « Supprimer » confirms; `add` opens a new line of `target`. The levers and
 * deliverables are the page's project's (none elsewhere: a line keeps its
 * own).
 */
export function useBudgetLineDialogs({
  target,
  levers = [],
  deliverables = [],
  organizationId = null,
}: {
  target: BudgetTarget | null;
  levers?: BudgetLever[];
  deliverables?: BudgetDeliverable[];
  organizationId?: string | null;
}) {
  const [editing, setEditing] = useState<BudgetLine | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<BudgetLine | null>(null);
  const formTarget = editing?.target ?? target;
  const samePage =
    formTarget !== null &&
    target !== null &&
    formTarget.kind === target.kind &&
    formTarget.id === target.id;

  const dialogs = (
    <>
      {formTarget && (
        <BudgetLineSheet
          target={formTarget}
          line={editing}
          levers={samePage ? levers : []}
          deliverables={samePage ? deliverables : []}
          organizationId={organizationId}
          open={open}
          onOpenChange={setOpen}
        />
      )}
      <DeleteBudgetLineDialog
        line={deleting}
        onClose={() => setDeleting(null)}
      />
    </>
  );

  return {
    add: () => {
      setEditing(null);
      setOpen(true);
    },
    edit: (line: BudgetLine) => {
      setEditing(line);
      setOpen(true);
    },
    remove: setDeleting,
    dialogs,
  };
}

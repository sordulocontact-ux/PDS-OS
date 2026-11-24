"use client";

import { BudgetLineForm } from "@/components/budget/budget-line-form";
import type {
  BudgetDeliverable,
  BudgetLever,
  BudgetLine,
  BudgetTarget,
} from "@/lib/budget/types";
import { FormDialog } from "@/components/ui/form-dialog";
import { budget } from "@/lib/i18n/fr/budget";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { budget, dialogs };

// Modal to add a line (line = null) or edit one. Mounted per opening,
// so the fields always start from the saved values.
export function BudgetLineSheet({
  target,
  line,
  levers,
  deliverables,
  organizationId,
  asFinance,
  open,
  onOpenChange,
}: {
  target: BudgetTarget;
  line: BudgetLine | null;
  levers?: BudgetLever[];
  deliverables?: BudgetDeliverable[];
  organizationId?: string | null;
  // A project's spend written as the Finance (BudgetLineForm).
  asFinance?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = fr.budget.form;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={line ? t.editTitle : t.newTitle}
      description={t.description}
      closeLabel={fr.dialogs.close}
    >
      <BudgetLineForm
        target={target}
        line={line}
        levers={levers}
        deliverables={deliverables}
        organizationId={organizationId}
        asFinance={asFinance}
        onDone={() => onOpenChange(false)}
      />
    </FormDialog>
  );
}

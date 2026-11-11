"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/framing/option-select";
import { Label } from "@/components/ui/label";
import { isBudgetStatus, type BudgetStatus } from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";

const fr = { budget };

/** Where a spend stands and its day, side by side (BUD 1). The state of a
 * line that follows an invoice is the invoice's. */
export function BudgetStatusDateFields({
  status,
  spentOn,
  spentOnError,
  statusLocked,
  onStatus,
  onSpentOn,
}: {
  status: BudgetStatus;
  spentOn: string;
  spentOnError?: string;
  statusLocked: boolean;
  onStatus: (status: BudgetStatus) => void;
  onSpentOn: (day: string) => void;
}) {
  const t = fr.budget.form;
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="grid content-start gap-1.5">
        <Label htmlFor="budget-status" required>
          {t.status}
        </Label>
        <OptionSelect
          id="budget-status"
          required
          fill
          label={t.status}
          options={fr.budget.statuses}
          disabled={statusLocked}
          value={status}
          onChange={(s) => isBudgetStatus(s) && onStatus(s)}
        />
      </div>
      <Field
        name="spent-on"
        type="date"
        label={t.spentOn}
        aria-required
        value={spentOn}
        error={spentOnError}
        onChange={(e) => onSpentOn(e.target.value)}
      />
    </div>
  );
}

"use client";

import { FieldError } from "@/components/auth/form-message";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import type { BudgetTarget, ExpenseTarget } from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";

const fr = { budget };

export const targetKey = (t: BudgetTarget) => `${t.kind}:${t.id}`;

/**
 * « Pour » of a quick spend (BUD 4): a project the reader runs or an
 * artist, searched as one types, the last ones spent on first.
 */
export function BudgetTargetField({
  targets,
  value,
  error,
  onChange,
}: {
  targets: ExpenseTarget[];
  // targetKey of the one chosen, "" for none.
  value: string;
  error?: string;
  onChange: (key: string) => void;
}) {
  const t = fr.budget.form;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="budget-target" required>
        {t.target}
      </Label>
      <SearchSelect
        id="budget-target"
        label={t.target}
        required
        options={{
          "": t.targetPlaceholder,
          ...Object.fromEntries(
            targets.map((target) => [
              targetKey(target),
              t.targetOption(target.label, target.kind, target.recent ?? false),
            ]),
          ),
        }}
        value={value}
        onChange={onChange}
        searchPlaceholder={t.targetSearch}
        emptyLabel={t.targetNone}
        fill
      />
      {error && <FieldError id="budget-target-error">{error}</FieldError>}
    </div>
  );
}

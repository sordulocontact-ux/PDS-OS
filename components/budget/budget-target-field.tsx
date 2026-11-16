"use client";

import { FieldError } from "@/components/auth/form-message";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BudgetTarget, ExpenseTarget } from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";
import { budgetTargetHue } from "@/lib/ui/category-hues";

const fr = { budget };

export const targetKey = (t: BudgetTarget) => `${t.kind}:${t.id}`;

/**
 * « Pour » of a quick spend (BUD 4): a project the reader runs or an
 * artist (for the Finance, a cost center or « Hors budget » too), searched as one types, the last ones spent on first. The name is
 * the choice; its kind is a badge in its hue (Projet, Artiste), so the two
 * read apart at a glance (Sacha 11/11/2026).
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
  const byKey = new Map(targets.map((target) => [targetKey(target), target]));
  // The Finance also chooses a cost center or « Hors budget ».
  const words = targets.some((target) => target.kind === "off_budget")
    ? t.finance
    : t;
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
          "": words.targetPlaceholder,
          ...Object.fromEntries(
            targets.map((target) => [targetKey(target), target.label]),
          ),
        }}
        value={value}
        onChange={onChange}
        searchPlaceholder={words.targetSearch}
        emptyLabel={words.targetNone}
        fill
        keywords={(key) => {
          const target = byKey.get(key);
          return target ? t.targetKinds[target.kind] : "";
        }}
        badge={(key) => {
          const target = byKey.get(key);
          if (!target) return null;
          return (
            <span className="flex shrink-0 items-center gap-2">
              {target.recent && (
                <span className="text-[length:var(--type-caption)] text-[color:var(--text-tertiary)]">
                  {t.targetRecent}
                </span>
              )}
              <StatusBadge tone={budgetTargetHue[target.kind]} size="sm">
                {t.targetKinds[target.kind]}
              </StatusBadge>
            </span>
          );
        }}
      />
      {byKey.get(value)?.kind === "off_budget" && (
        <p className="text-caption text-[color:var(--tone-warning-fg)]">
          {t.offBudgetHint}
        </p>
      )}
      {error && <FieldError id="budget-target-error">{error}</FieldError>}
    </div>
  );
}

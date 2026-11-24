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

// A sub-budget of a target in the same list: « Frais de structure › Loyer ».
const PART = "|part:";
const partKey = (target: BudgetTarget, partId: string) =>
  `${targetKey(target)}${PART}${partId}`;

/**
 * « Pour » of a quick spend (BUD 4): a project the reader runs or an
 * artist (for the Finance, a cost center or « Hors budget » too), searched as one types, the last ones spent on first. The name is
 * the choice; its kind is a badge in its hue (Projet, Artiste), so the two
 * read apart at a glance (Sacha 11/11/2026). For the Finance, each budget
 * cut into sub-budgets is followed by them (« Frais de structure › Loyer »):
 * one choice puts the spend in its budget and its sub-budget (Sacha
 * 24/11/2026). `partId`: the sub-budget chosen, given back with the target.
 */
export function BudgetTargetField({
  targets,
  value,
  partId,
  error,
  onChange,
}: {
  targets: ExpenseTarget[];
  // targetKey of the one chosen, "" for none.
  value: string;
  partId?: string;
  error?: string;
  onChange: (key: string, partId?: string) => void;
}) {
  const t = fr.budget.form;
  const byKey = new Map(
    targets.flatMap((target) => [
      [targetKey(target), target] as const,
      ...(target.parts ?? []).map(
        (part) => [partKey(target, part.id), target] as const,
      ),
    ]),
  );
  const partName = new Map(
    targets.flatMap((target) =>
      (target.parts ?? []).map(
        (part) => [partKey(target, part.id), part.name] as const,
      ),
    ),
  );
  const shown =
    value && partId && partName.has(`${value}${PART}${partId}`)
      ? `${value}${PART}${partId}`
      : value;
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
            targets.flatMap((target) => [
              [targetKey(target), target.label],
              ...(target.parts ?? []).map((part) => [
                partKey(target, part.id),
                t.targetPart(target.label, part.name),
              ]),
            ]),
          ),
        }}
        value={shown}
        onChange={(key) => {
          const [target, part] = key.split(PART);
          onChange(target, part);
        }}
        searchPlaceholder={words.targetSearch}
        emptyLabel={words.targetNone}
        fill
        keywords={(key) => {
          const target = byKey.get(key);
          return target
            ? [t.targetKinds[target.kind], partName.get(key) && t.partWord]
                .filter(Boolean)
                .join(" ")
            : "";
        }}
        badge={(key) => {
          const target = byKey.get(key);
          if (!target) return null;
          return (
            <span className="flex shrink-0 items-center gap-2">
              {target.recent && !partName.has(key) && (
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

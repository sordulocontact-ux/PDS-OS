// What the form of a spend starts with and what it still misses (BUD 1,
// BUD 4). Client-safe, pure code.

import type {
  BudgetFamily,
  BudgetStatus,
  BudgetTarget,
} from "@/lib/budget/types";
import { budget } from "@/lib/i18n/fr/budget";
import { parseEurosToCents } from "@/lib/projects/schemas";

/** What a new line starts with: a draft of PO, a quick entry (« déjà
 * payée »). Every value optional. */
export type BudgetLineInitial = Partial<{
  label: string;
  amount: string;
  status: BudgetStatus | null;
  family: BudgetFamily | null;
  note: string;
  spentOn: string;
}>;

/** Each field still missing, with why (CLAUDE.md, « Formulaires »). */
export function lineFormErrors(input: {
  amount: string;
  label: string;
  spentOn: string;
  family: string;
  familyDetail: string;
  target: BudgetTarget | null;
}) {
  const t = budget.form;
  const cents = parseEurosToCents(input.amount);
  return {
    amount: cents === null || cents === undefined ? t.invalidAmount : undefined,
    label: input.label.trim() ? undefined : t.labelMissing,
    detail:
      input.family === "other" && !input.familyDetail.trim()
        ? t.familyDetailRequired
        : undefined,
    spentOn: input.spentOn ? undefined : t.spentOnMissing,
    target: input.target ? undefined : t.targetMissing,
  };
}

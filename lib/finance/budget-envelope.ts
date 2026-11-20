// Finance › Budgets: a budget cut into parts (« sous-budgets », retour d'Ibé du
// 18/11/2026: « 20 000 €, dont 10 000 de marketing et 10 000 d'enregistrement »).
// « Envelope » already means a whole budget in the code, so a slice is a part.
// Client-safe, pure code: every figure is computed here from the spends
// (CLAUDE.md, rule 6), never stored.

import { engagedOf, totalsOf } from "@/lib/finance/envelopes";
import type { FinanceSpend } from "@/lib/finance/spends";

export type BudgetPart = {
  id: string;
  name: string;
  amountCents: number;
};

export type PartRow = BudgetPart & {
  // Committed, invoiced or paid: what the part already spent, as the budget.
  spentCents: number;
  restCents: number;
  lines: number;
};

export type PartsSummary = {
  rows: PartRow[];
  // The sum of the parts' amounts.
  allocatedCents: number;
  // The budget less the parts (negative: the parts exceed it); null when the
  // budget has no amount.
  unallocatedCents: number | null;
  // What the spends outside every part already spent.
  looseSpentCents: number;
  looseLines: number;
};

/**
 * The parts of a budget with what each spent and has left, and the share of
 * the budget no part holds. `partOf`: spend id → part id. `spends`: the
 * budget's own spends (a refused quote never counts).
 */
export function splitBudget(
  parts: BudgetPart[],
  spends: FinanceSpend[],
  partOf: Record<string, string>,
  budgetCents: number | null,
): PartsSummary {
  const live = spends.filter((s) => !s.refused);
  const rows = parts.map((part): PartRow => {
    const totals = totalsOf(live.filter((s) => partOf[s.id] === part.id));
    const spentCents = engagedOf(totals);
    return {
      ...part,
      spentCents,
      restCents: part.amountCents - spentCents,
      lines: totals.lines,
    };
  });
  const known = new Set(parts.map((p) => p.id));
  const loose = totalsOf(live.filter((s) => !known.has(partOf[s.id] ?? "")));
  const allocatedCents = parts.reduce((sum, p) => sum + p.amountCents, 0);
  return {
    rows,
    allocatedCents,
    unallocatedCents:
      budgetCents === null ? null : budgetCents - allocatedCents,
    looseSpentCents: engagedOf(loose),
    looseLines: loose.lines,
  };
}

/** The spends a part holds by its name already: a spend whose sub-post is
 * the part's name and that is in no part yet (pre-ticked when attaching). */
export function namedLike(
  part: Pick<BudgetPart, "name">,
  spend: Pick<FinanceSpend, "subpost">,
) {
  return (
    spend.subpost !== null &&
    spend.subpost.trim().toLowerCase() === part.name.trim().toLowerCase()
  );
}

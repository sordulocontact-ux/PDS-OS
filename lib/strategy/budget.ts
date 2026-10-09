// The strategy budget's totals, by code (rule 6): proposed = every line,
// validated = the validated lines, to arbitrate = the rest; and the split by
// lever. Client-safe.

export type BudgetRow = {
  lever_id: string | null;
  amount_cents: number;
  state: string;
};

export type BudgetSums = {
  proposed: number;
  validated: number;
  toDecide: number;
};

export function budgetSums(lines: BudgetRow[]): BudgetSums {
  const sums = { proposed: 0, validated: 0, toDecide: 0 };
  for (const line of lines) {
    sums.proposed += line.amount_cents;
    if (line.state === "validated") sums.validated += line.amount_cents;
    else sums.toDecide += line.amount_cents;
  }
  return sums;
}

/** Totals per lever (null = outside any lever), in first-seen order. */
export function budgetByLever(
  lines: BudgetRow[],
): Array<{ leverId: string | null } & BudgetSums> {
  const groups = new Map<string | null, BudgetRow[]>();
  for (const line of lines) {
    const list = groups.get(line.lever_id) ?? [];
    list.push(line);
    groups.set(line.lever_id, list);
  }
  return [...groups].map(([leverId, rows]) => ({
    leverId,
    ...budgetSums(rows),
  }));
}

/** "1500,5" or "1 500 €" typed by a person → cents; null if not an amount. */
export function parseEurosToCents(input: string): number | null {
  const normalized = input.replace(/[\s€  ]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return cents > 0 ? cents : null;
}

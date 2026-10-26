// The Marketing budget by activation (recette of 23/10, MKT-BIL-002): each
// line of the project's budget is read on its activation — the one it names
// (budget_lines.activation_id), else the activation of its deliverable, else
// the only activation of its lever — and summed as estimated, committed,
// invoiced and paid; the rest is « Hors activation ». The gap to the
// envelope is the envelope minus the committed, like the Budget module
// (lib/budget/types.ts). Computed by code, never stored. Pure, client-safe.

export type BudgetLineInput = {
  id: string;
  amountCents: number;
  status: string;
  activationId: string | null;
  deliverableId: string | null;
  leverId: string | null;
};

export type BudgetActivation = {
  id: string;
  title: string;
  deliverableId: string | null;
  leverId: string | null;
};

export type BudgetRow = {
  // An activation's id, or null for « Hors activation » and the total.
  activationId: string | null;
  title: string;
  lines: number;
  estimatedCents: number;
  committedCents: number;
  invoicedCents: number;
  paidCents: number;
};

export type BudgetBreakdown = {
  rows: BudgetRow[];
  total: BudgetRow;
  envelopeCents: number | null;
  // Envelope minus committed; negative = overrun; null without an envelope.
  gapCents: number | null;
};

const ESTIMATED = ["planned", "proposed"];
const COMMITTED = ["committed", "invoiced", "paid"];
const INVOICED = ["invoiced", "paid"];

/** The activation a line pays for, or null. */
export function lineActivation(
  line: BudgetLineInput,
  activations: BudgetActivation[],
): string | null {
  if (line.activationId) return line.activationId;
  const byDeliverable = line.deliverableId
    ? activations.filter((a) => a.deliverableId === line.deliverableId)
    : [];
  if (byDeliverable.length === 1) return byDeliverable[0].id;
  const byLever = line.leverId
    ? activations.filter((a) => a.leverId === line.leverId)
    : [];
  return byLever.length === 1 ? byLever[0].id : null;
}

const empty = (activationId: string | null, title: string): BudgetRow => ({
  activationId,
  title,
  lines: 0,
  estimatedCents: 0,
  committedCents: 0,
  invoicedCents: 0,
  paidCents: 0,
});

function add(row: BudgetRow, line: BudgetLineInput): void {
  row.lines += 1;
  if (ESTIMATED.includes(line.status)) row.estimatedCents += line.amountCents;
  if (COMMITTED.includes(line.status)) row.committedCents += line.amountCents;
  if (INVOICED.includes(line.status)) row.invoicedCents += line.amountCents;
  if (line.status === "paid") row.paidCents += line.amountCents;
}

export function budgetBreakdown(
  lines: BudgetLineInput[],
  activations: BudgetActivation[],
  envelopeCents: number | null,
  labels: { outside: string; total: string },
): BudgetBreakdown {
  const rows = new Map<string, BudgetRow>(
    activations.map((a) => [a.id, empty(a.id, a.title)]),
  );
  const outside = empty(null, labels.outside);
  const total = empty(null, labels.total);
  for (const line of lines) {
    const id = lineActivation(line, activations);
    add((id && rows.get(id)) || outside, line);
    add(total, line);
  }
  return {
    rows: [...rows.values(), outside].filter((r) => r.lines > 0),
    total,
    envelopeCents,
    gapCents:
      envelopeCents === null ? null : envelopeCents - total.committedCents,
  };
}

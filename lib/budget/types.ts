// Budget lines and their totals. Client-safe, pure code: every amount shown
// is computed here from the lines, never by PO (CLAUDE.md, rule 6).

// Estimé → Proposé (a quote, not accepted) → Engagé (accepted) → Payé
// (ticket Master § 9). A proposed amount does not consume the envelope.
export const BUDGET_STATUSES = [
  "planned",
  "proposed",
  "committed",
  "paid",
] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

export const BUDGET_FAMILIES = [
  "creation_content",
  "promotion_distribution",
  "experiences_activations",
  "other",
] as const;
export type BudgetFamily = (typeof BUDGET_FAMILIES)[number];

export type BudgetLine = {
  id: string;
  label: string;
  amountCents: number;
  status: BudgetStatus;
  family: BudgetFamily | null;
  leverId: string | null;
  leverLabel: string | null;
  note: string | null;
};

export type BudgetLever = { id: string; label: string };

export type BudgetTotals = {
  plannedCents: number;
  // Quoted, not accepted yet: shown, never taken from the envelope.
  proposedCents: number;
  // Committed includes paid: money the project is bound to spend.
  committedCents: number;
  paidCents: number;
  // Envelope minus committed; null without an envelope. Negative = overrun.
  remainingCents: number | null;
};

export function isBudgetStatus(value: unknown): value is BudgetStatus {
  return (
    typeof value === "string" &&
    (BUDGET_STATUSES as readonly string[]).includes(value)
  );
}

export function isBudgetFamily(value: unknown): value is BudgetFamily {
  return (
    typeof value === "string" &&
    (BUDGET_FAMILIES as readonly string[]).includes(value)
  );
}

export function budgetTotals(
  lines: Pick<BudgetLine, "amountCents" | "status">[],
  envelopeCents: number | null,
): BudgetTotals {
  const sum = (statuses: BudgetStatus[]) =>
    lines
      .filter((l) => statuses.includes(l.status))
      .reduce((total, l) => total + l.amountCents, 0);
  const committedCents = sum(["committed", "paid"]);
  return {
    plannedCents: sum(["planned"]),
    proposedCents: sum(["proposed"]),
    committedCents,
    paidCents: sum(["paid"]),
    remainingCents:
      envelopeCents === null ? null : envelopeCents - committedCents,
  };
}

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export const formatEuros = (cents: number): string =>
  euroFormatter.format(cents / 100);

// The amount as typed back into the form ("1500,5"), without currency sign.
export const centsToInput = (cents: number): string =>
  (cents / 100).toString().replace(".", ",");

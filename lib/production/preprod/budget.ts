// Préproduction › Budget (ticket, parcours 9): the envelope (Production's,
// else the Fiche Livrable's) against the estimates per position, totalled
// by code. An estimate above the envelope asks for an arbitration, it never
// blocks. Not the project's Finance (budget_lines stay the commitments).
// Client-safe.

import type { PreprodBudgetLine, PreprodBudgetStatus } from "./types";

export type PreprodBudgetTotals = {
  envelopeCents: number | null;
  // Every line with an amount (all but « À estimer »).
  estimatedCents: number;
  byStatus: Record<PreprodBudgetStatus, { count: number; cents: number }>;
  // Envelope − estimated; null without an envelope.
  remainingCents: number | null;
  over: boolean;
};

export function preprodBudgetTotals(
  lines: PreprodBudgetLine[],
  envelopeCents: number | null,
): PreprodBudgetTotals {
  const byStatus: PreprodBudgetTotals["byStatus"] = {
    planned: { count: 0, cents: 0 },
    to_estimate: { count: 0, cents: 0 },
    estimated: { count: 0, cents: 0 },
    to_decide: { count: 0, cents: 0 },
    validated: { count: 0, cents: 0 },
    committed: { count: 0, cents: 0 },
  };
  let estimated = 0;
  for (const line of lines) {
    const cents = line.amountCents ?? 0;
    byStatus[line.status].count += 1;
    byStatus[line.status].cents += cents;
    estimated += cents;
  }
  const remaining = envelopeCents === null ? null : envelopeCents - estimated;
  return {
    envelopeCents,
    estimatedCents: estimated,
    byStatus,
    remainingCents: remaining,
    over: remaining !== null && remaining < 0,
  };
}

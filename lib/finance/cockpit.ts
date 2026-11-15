// What Finance's overview shows (Ibé's ticket « Cockpit Finance », maquette
// 1): « combien avons-nous, qu'est-ce qui va entrer ou sortir, et où faut-il
// agir ? ». Computed from the treasury, the money in and the budgets.
// Client-safe, pure code.

import type { Alert } from "@/lib/finance/alerts";
import type { BudgetRow } from "@/lib/finance/aggregate";
import {
  envelopeRow,
  type Envelope,
  type EnvelopeRow,
} from "@/lib/finance/envelopes";
import { isOpen, type Income } from "@/lib/finance/money-in";
import { engineMoves, type EngineData } from "@/lib/finance/engines";
import {
  addDays,
  engineLabels,
  treasuryEvents,
  type TreasuryEvent,
} from "@/lib/finance/treasury";
import type { FinanceSpend } from "@/lib/finance/spends";
import type { FinanceLine } from "@/lib/finance/types";

// « Budget consommé à 82 % ou dépassement » (ticket, « Alertes utiles »).
export const BUDGET_ALERT_SHARE = 0.82;
// How many rows each card of the overview names.
const WATCH_COUNT = 5;
const BUDGET_COUNT = 3;
const NEXT_COUNT = 3;

/** One side of the money: what comes in, or what goes out. */
export type Flow = {
  cents: number;
  count: number;
  // Of which past its day (an income past due, a spend not paid in time).
  lateCents: number;
  next: TreasuryEvent[];
};

export type Cockpit = {
  // Every move awaited in up to the horizon: the total and the rows below
  // it come from the same lines.
  incoming: Flow;
  // Every spend to pay up to the horizon.
  outgoing: Flow;
  // What the live budgets still allow (`budgetsAvailable`, the same figure
  // on the overview and on Trésorerie).
  availableCents: number;
  activeEnvelopes: number;
  // The first alerts (the Alertes page's, so the same count as the bell)
  // and how many there are in all.
  watch: Alert[];
  watchTotal: number;
  budgets: BudgetRow[];
};

const flow = (events: TreasuryEvent[]): Flow => ({
  cents: events.reduce((sum, e) => sum + e.cents, 0),
  count: events.length,
  lateCents: events.filter((e) => e.dueOn).reduce((sum, e) => sum + e.cents, 0),
  next: events.slice(0, NEXT_COUNT),
});

/** The live budgets that have an amount (project, artist, other), the
 * nearest to their limit first, overruns leading. One list for every card
 * and figure of Finance that says what the budgets allow. */
export function liveBudgetRows(
  envelopes: Envelope[],
  spends: FinanceSpend[],
): EnvelopeRow[] {
  const ratio = (r: EnvelopeRow) =>
    r.currentCents ? r.engagedCents / r.currentCents : -1;
  return envelopes
    .filter((e) => !e.archived)
    .map((e) => envelopeRow(e, spends))
    .filter((r) => r.currentCents !== null)
    .sort((a, b) => ratio(b) - ratio(a) || b.engagedCents - a.engagedCents);
}

/** What those budgets still allow: the sum of what is left of each one
 * (an overrun does not take from another). */
export const budgetsAvailable = (rows: EnvelopeRow[]) =>
  rows.reduce((sum, r) => sum + Math.max(r.restCents ?? 0, 0), 0);

/** A budget row as the cards draw it. */
export const asBudgetRow = (r: EnvelopeRow): BudgetRow => ({
  id: r.id,
  envelopeCents: r.currentCents,
  engagedCents: r.engagedCents,
  estimatedCents: r.totals.plannedCents,
  restCents: r.restCents,
});

export function cockpit({
  incomes,
  upcoming,
  envelopes,
  spends,
  alerts,
  engines,
  today,
  horizon,
}: {
  incomes: Income[];
  upcoming: FinanceLine[];
  envelopes: Envelope[];
  spends: FinanceSpend[];
  alerts: Alert[];
  engines?: EngineData;
  today: string;
  horizon: number;
}): Cockpit {
  // The moves are counted without any statement of the account too: what
  // comes in and goes out does not wait for the balance.
  const until = addDays(today, horizon);
  const events = treasuryEvents(
    incomes.filter(isOpen),
    upcoming,
    today,
    until,
    engines ? engineMoves(engines, today, until, engineLabels) : [],
  );
  const rows = liveBudgetRows(envelopes, spends);

  return {
    incoming: flow(events.filter((e) => e.direction === "in")),
    outgoing: flow(events.filter((e) => e.direction === "out")),
    availableCents: budgetsAvailable(rows),
    activeEnvelopes: rows.length,
    watch: alerts.slice(0, WATCH_COUNT),
    watchTotal: alerts.length,
    budgets: rows.slice(0, BUDGET_COUNT).map(asBudgetRow),
  };
}

// What Finance's overview shows (Ibé's ticket « Cockpit Finance », maquette
// 1): « combien avons-nous, qu'est-ce qui va entrer ou sortir, et où faut-il
// agir ? ». Computed from the treasury, the money in and the budgets.
// Client-safe, pure code.

import {
  projectBudgets,
  spendSums,
  type BudgetRow,
} from "@/lib/finance/aggregate";
import {
  daysLate,
  incomeState,
  isOpen,
  remainingCents,
  type Income,
} from "@/lib/finance/money-in";
import { engineMoves, type EngineData } from "@/lib/finance/engines";
import {
  addDays,
  engineLabels,
  treasuryEvents,
  type Treasury,
  type TreasuryEvent,
} from "@/lib/finance/treasury";
import {
  rebillMissing,
  spendTtc,
  type FinanceSpend,
} from "@/lib/finance/spends";
import type { FinanceData, FinanceLine } from "@/lib/finance/types";

// « Budget consommé à 82 % ou dépassement » (ticket, « Alertes utiles »).
export const BUDGET_ALERT_SHARE = 0.82;
// How many rows each card of the overview names.
const WATCH_COUNT = 5;
const BUDGET_COUNT = 3;
const NEXT_COUNT = 3;

export type WatchItem =
  | { kind: "below_reserve"; day: string; cents: number }
  | {
      kind: "late_income";
      id: string;
      label: string;
      days: number;
      cents: number;
    }
  | { kind: "budget"; id: string; share: number; restCents: number }
  | { kind: "no_proof"; count: number }
  // Lot 3: spends on no envelope, rebillable spends not paid back.
  | { kind: "off_budget"; count: number; cents: number }
  | { kind: "rebill"; count: number };

/** One side of the money: what comes in, or what goes out. */
export type Flow = {
  cents: number;
  count: number;
  // Of which past its day (an income past due, a spend not paid in time).
  lateCents: number;
  next: TreasuryEvent[];
};

export type Cockpit = {
  // Every open income, whatever its day.
  incoming: Flow;
  // Every spend to pay up to the horizon.
  outgoing: Flow;
  availableCents: number;
  activeEnvelopes: number;
  watch: WatchItem[];
  budgets: BudgetRow[];
};

const flow = (events: TreasuryEvent[], cents: number, count: number) => ({
  cents,
  count,
  lateCents: events.filter((e) => e.dueOn).reduce((sum, e) => sum + e.cents, 0),
  next: events.slice(0, NEXT_COUNT),
});

const share = (row: BudgetRow) =>
  row.envelopeCents ? row.engagedCents / row.envelopeCents : 0;

export function cockpit({
  treasury,
  incomes,
  upcoming,
  spending,
  spends = [],
  engines,
  today,
  horizon,
}: {
  treasury: Treasury | null;
  incomes: Income[];
  upcoming: FinanceLine[];
  spending: FinanceData;
  spends?: FinanceSpend[];
  engines?: EngineData;
  today: string;
  horizon: number;
}): Cockpit {
  const open = incomes.filter(isOpen);
  // The moves are counted without any statement of the account too: what
  // comes in and goes out does not wait for the balance.
  const until = addDays(today, horizon);
  const events = treasuryEvents(
    open,
    upcoming,
    today,
    until,
    engines ? engineMoves(engines, today, until, engineLabels) : [],
  );
  const ins = events.filter((e) => e.direction === "in");
  const outs = events.filter((e) => e.direction === "out");
  // A project's envelope is its whole: what is left of each live one. The
  // artists' envelopes are not added, their projects already spend them.
  const envelopes = projectBudgets(spending.months, spending.projects).filter(
    (r) => r.envelopeCents !== null,
  );
  const watched = envelopes.filter((r) => share(r) >= BUDGET_ALERT_SHARE);

  const late = open
    .filter((i) => incomeState(i, today) === "late")
    .sort((a, b) => daysLate(b, today) - daysLate(a, today));
  const below =
    treasury && treasury.reserveCents > 0
      ? treasury.points.find(
          (p) => p.forecast && p.cents < treasury.reserveCents,
        )
      : undefined;
  const noProof = spendSums(spending.months).noProof;
  const live = spends.filter((s) => !s.refused);
  const offBudget = live.filter((s) => s.target.kind === "off_budget");
  const rebill = live.filter(rebillMissing);

  const watch: WatchItem[] = [
    ...(below
      ? [{ kind: "below_reserve" as const, day: below.day, cents: below.cents }]
      : []),
    ...late.map((i) => ({
      kind: "late_income" as const,
      id: i.id,
      label: i.label,
      days: daysLate(i, today),
      cents: remainingCents(i),
    })),
    ...watched.map((r) => ({
      kind: "budget" as const,
      id: r.id,
      share: share(r),
      restCents: r.restCents ?? 0,
    })),
    ...(offBudget.length > 0
      ? [
          {
            kind: "off_budget" as const,
            count: offBudget.length,
            cents: offBudget.reduce((sum, s) => sum + spendTtc(s), 0),
          },
        ]
      : []),
    ...(rebill.length > 0
      ? [{ kind: "rebill" as const, count: rebill.length }]
      : []),
    ...(noProof > 0 ? [{ kind: "no_proof" as const, count: noProof }] : []),
  ].slice(0, WATCH_COUNT);

  return {
    incoming: flow(
      ins,
      open.reduce((sum, i) => sum + remainingCents(i), 0),
      open.length,
    ),
    outgoing: flow(
      outs,
      outs.reduce((sum, e) => sum + e.cents, 0),
      outs.length,
    ),
    availableCents: envelopes.reduce(
      (sum, r) => sum + Math.max(r.restCents ?? 0, 0),
      0,
    ),
    activeEnvelopes: envelopes.length,
    watch,
    budgets: envelopes.slice(0, BUDGET_COUNT),
  };
}

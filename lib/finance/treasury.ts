// The treasury (Ibé's ticket « Cockpit Finance », 13/11/2026): the bank
// balance today and its forecast, computed at each reading from the last
// statement of the account, what came in and went out since, and what is
// awaited. Client-safe, pure code: never stored, never written by PO.
//
// - Today's balance = the last statement + receipts − paid spends dated
//   after it, up to today.
// - The forecast adds, from today on, what each open income still awaits
//   (on its due day, else the day expected) and takes away each spend not
//   paid yet (on its invoice's due day, else its own day). Whatever is late
//   is counted today: it is awaited at any moment. A spend marked paid left
//   the account, even dated later.
// - Spends are entered excl. tax in PDS OS: the forecast takes them as they
//   are, until a spend carries its incl. tax amount (next lot).

import {
  EMPTY_ENGINES,
  engineMoves,
  installmentsPaid,
  type EngineData,
  type EngineMove,
} from "@/lib/finance/engines";
import { fundings } from "@/lib/i18n/fr/fundings";
import {
  awaitedOn,
  incomeState,
  remainingCents,
  type Income,
  type IncomeState,
} from "@/lib/finance/money-in";
import type { FinanceLine } from "@/lib/finance/types";
import { treasuryWeeks, type TreasuryWeek } from "@/lib/finance/treasury-weeks";

export const TREASURY_HORIZONS = [30, 60, 90] as const;
export type TreasuryHorizon = (typeof TREASURY_HORIZONS)[number];
export const DEFAULT_HORIZON: TreasuryHorizon = 90;

export const asHorizon = (value: unknown): TreasuryHorizon => {
  const n = Number(value);
  return (TREASURY_HORIZONS as readonly number[]).includes(n)
    ? (n as TreasuryHorizon)
    : DEFAULT_HORIZON;
};

// How far back the chart shows the real balance.
export const PAST_DAYS = 30;

export type Statement = { cents: number; asOf: string };

/** A spend paid on a day (finance_cash_out, status paid). */
export type PaidDay = { day: string; cents: number };

/** One move of the forecast: money awaited in, or a spend to pay. */
export type TreasuryEvent = {
  key: string;
  day: string;
  // The day it was due, when it is late and counted today.
  dueOn: string | null;
  label: string;
  direction: "in" | "out";
  cents: number;
  projectId: string | null;
  artistId: string | null;
  source:
    | { kind: "income"; id: string; state: IncomeState }
    | { kind: "spend"; id: string; status: FinanceLine["status"] }
    // Lot 5: an Orchard advance, a show's cost, a Pay Later installment.
    | { kind: "engine"; engine: EngineMove["engine"] };
};

/** How an engine's move is named in the calendar. */
export const engineLabels = {
  orchard: fundings.moves.orchard,
  show: fundings.moves.show,
  installment: fundings.moves.installment,
};

export type TreasuryPoint = { day: string; cents: number; forecast: boolean };

export type Treasury = {
  statement: Statement;
  todayCents: number;
  reserveCents: number;
  events: (TreasuryEvent & { balanceCents: number })[];
  points: TreasuryPoint[];
  // Money in and out by week, from the first point to the horizon (chart).
  weeks: TreasuryWeek[];
  low: { day: string; cents: number };
  at: (days: number) => number;
};

export const addDays = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);

const maxDay = (a: string, b: string) => (a > b ? a : b);

/** The forecast's moves up to the horizon, by day, ins before outs. */
export function treasuryEvents(
  incomes: Income[],
  upcoming: FinanceLine[],
  today: string,
  until: string,
  moves: EngineMove[] = [],
): TreasuryEvent[] {
  const ins = incomes.flatMap((income): TreasuryEvent[] => {
    const cents = remainingCents(income);
    const due = awaitedOn(income);
    const day = maxDay(due, today);
    if (cents <= 0 || day > until) return [];
    return [
      {
        key: `in-${income.id}`,
        day,
        dueOn: due < today ? due : null,
        label: income.label,
        direction: "in",
        cents,
        projectId: income.projectId,
        artistId: income.artistId,
        source: {
          kind: "income",
          id: income.id,
          state: incomeState(income, today),
        },
      },
    ];
  });
  const outs = upcoming.flatMap((line): TreasuryEvent[] => {
    const due = line.dueOn ?? line.spentOn;
    const day = maxDay(due, today);
    if (day > until) return [];
    return [
      {
        key: `out-${line.id}`,
        day,
        dueOn: due < today ? due : null,
        label: line.label,
        direction: "out",
        cents: line.cents,
        projectId: line.projectId,
        artistId: line.artistId,
        source: { kind: "spend", id: line.id, status: line.status },
      },
    ];
  });
  const engines = moves.map((m): TreasuryEvent => ({
    key: m.key,
    day: m.day,
    dueOn: null,
    label: m.label,
    direction: m.direction,
    cents: m.cents,
    projectId: null,
    artistId: null,
    source: { kind: "engine", engine: m.engine },
  }));
  return [...ins, ...outs, ...engines].sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      (a.direction === b.direction ? 0 : a.direction === "in" ? -1 : 1) ||
      b.cents - a.cents,
  );
}

const signed = (e: TreasuryEvent) =>
  e.direction === "in" ? e.cents : -e.cents;

/** Null without any statement of the account: nothing to start from. */
export function computeTreasury({
  statement,
  reserveCents,
  receipts,
  paid,
  incomes,
  upcoming,
  engines = EMPTY_ENGINES,
  today,
  horizon,
}: {
  statement: Statement | null;
  reserveCents: number;
  receipts: PaidDay[];
  paid: PaidDay[];
  incomes: Income[];
  upcoming: FinanceLine[];
  engines?: EngineData;
  today: string;
  // 30, 60 or 90 days on Trésorerie; the Planning reads up to the end of
  // the month it shows (at most 180 days).
  horizon: number;
}): Treasury | null {
  if (!statement) return null;
  const until = addDays(today, horizon);

  // The real balance, day by day, from the statement to today. A spend
  // marked paid has left the account, even dated later: counted today.
  const realMoves = new Map<string, number>();
  const move = (day: string, cents: number) => {
    const on = day > today ? today : day;
    if (on <= statement.asOf) return;
    realMoves.set(on, (realMoves.get(on) ?? 0) + cents);
  };
  receipts.forEach((r) => move(r.day, r.cents));
  paid.forEach((p) => move(p.day, -p.cents));
  installmentsPaid(engines, statement.asOf, today).forEach((p) =>
    move(p.day, -p.cents),
  );

  const start = maxDay(statement.asOf, addDays(today, -PAST_DAYS));
  const points: TreasuryPoint[] = [];
  let cents = statement.cents;
  for (const [day, value] of realMoves) if (day <= start) cents += value;
  for (let day = start; day <= today; day = addDays(day, 1)) {
    if (day > start) cents += realMoves.get(day) ?? 0;
    points.push({ day, cents, forecast: false });
  }
  const todayCents = cents;

  const events = treasuryEvents(
    incomes,
    upcoming,
    today,
    until,
    engineMoves(engines, today, until, engineLabels),
  );
  const byDay = new Map<string, number>();
  for (const e of events) byDay.set(e.day, (byDay.get(e.day) ?? 0) + signed(e));

  let running = todayCents;
  let low = { day: today, cents: todayCents };
  const balanceOn = new Map<string, number>();
  for (let day = today; day <= until; day = addDays(day, 1)) {
    running += byDay.get(day) ?? 0;
    balanceOn.set(day, running);
    points.push({ day, cents: running, forecast: true });
    if (running < low.cents) low = { day, cents: running };
  }

  let balance = todayCents;
  return {
    statement,
    todayCents,
    reserveCents,
    events: events.map((e) => {
      balance += signed(e);
      return { ...e, balanceCents: balance };
    }),
    points,
    weeks: treasuryWeeks({
      from: start,
      until,
      today,
      receipts,
      // A Pay Later installment paid has left the account too.
      paid: [...paid, ...installmentsPaid(engines, statement.asOf, today)],
      events,
    }),
    low,
    at: (days: number) =>
      balanceOn.get(addDays(today, Math.min(days, horizon))) ?? running,
  };
}

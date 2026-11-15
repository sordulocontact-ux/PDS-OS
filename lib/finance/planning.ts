// Finance › Planning (Sacha 15/11/2026, after Midday): each day of a month
// with its moves and its balance, read from what `computeTreasury` already
// counts. Client-safe, pure code: the balances, the low point and the
// reserve come from the treasury; this only puts them on their day.
//
// - Up to today, the real: each receipt of an income, the spends paid by
//   day, the Pay Later installments due.
// - From today, the forecast: the treasury's events, a late one on today.
// - A day's balance before and after = the treasury's points of the day
//   before and of the day (the forecast's point wins on today).

import { routes } from "@/lib/auth/redirects";
import { installmentsPaid, type EngineData } from "@/lib/finance/engines";
import { incomeState, type Income } from "@/lib/finance/money-in";
import { spendsHref } from "@/lib/finance/spend-links";
import {
  addDays,
  type PaidDay,
  type Treasury,
  type TreasuryEvent,
} from "@/lib/finance/treasury";
import { financePlanning as t } from "@/lib/i18n/fr/finance-planning";
import { incomeHref } from "@/lib/finance/income-links";

export type PlanningOrigin =
  "income" | "spend" | "paid" | "orchard" | "show" | "pay_later";

export type PlanningMove = {
  key: string;
  label: string;
  direction: "in" | "out";
  cents: number;
  origin: PlanningOrigin;
  // Already in or out of the account; else a move of the forecast.
  real: boolean;
  // The day it was due, when it is late and counted today.
  dueOn: string | null;
  // The balance after it (the forecast's; the real is by day).
  balanceCents: number | null;
  href: string;
};

// Under the reserve that day; the low point of the forecast (under the
// reserve or not).
export type PlanningMark = "reserve" | "low" | "low_under";

export type PlanningDay = {
  day: string;
  moves: PlanningMove[];
  inCents: number;
  outCents: number;
  beforeCents: number | null;
  afterCents: number | null;
  belowReserve: boolean;
  marks: PlanningMark[];
};

function forecastMove(e: Treasury["events"][number]): PlanningMove {
  const source: TreasuryEvent["source"] = e.source;
  const base = {
    key: e.key,
    label: e.label,
    direction: e.direction,
    cents: e.cents,
    real: false,
    dueOn: e.dueOn,
    balanceCents: e.balanceCents,
  };
  if (source.kind === "income")
    return {
      ...base,
      origin: "income",
      href: incomeHref(source.id, source.state),
    };
  if (source.kind === "spend")
    return {
      ...base,
      origin: "spend",
      href: spendsHref({ ouvrir: source.id }),
    };
  return { ...base, origin: source.engine, href: routes.financeFundings };
}

/** The days of `month` ("YYYY-MM"), each with its moves and balance. */
export function planningDays({
  month,
  today,
  treasury,
  incomes,
  paid,
  engines,
}: {
  month: string;
  today: string;
  treasury: Treasury | null;
  incomes: Income[];
  paid: PaidDay[];
  engines: EngineData;
}): PlanningDay[] {
  const first = `${month}-01`;
  const days: string[] = [];
  for (let d = first; d.startsWith(month); d = addDays(d, 1)) days.push(d);
  const last = days[days.length - 1];
  const moves = new Map<string, PlanningMove[]>();
  // A real move dated later is already out or in: counted today.
  const put = (day: string, move: PlanningMove) => {
    const on = move.real && day > today ? today : day;
    if (on < first || on > last) return;
    moves.set(on, [...(moves.get(on) ?? []), move]);
  };
  const real = { real: true, dueOn: null, balanceCents: null } as const;

  for (const income of incomes) {
    const href = incomeHref(income.id, incomeState(income, today));
    for (const r of income.receipts)
      put(r.receivedOn, {
        ...real,
        key: `rc-${r.id}`,
        label: income.label,
        direction: "in",
        cents: r.cents,
        origin: "income",
        href,
      });
  }
  paid.forEach((p, i) =>
    put(p.day, {
      ...real,
      key: `paid-${p.day}-${i}`,
      label: t.paidLabel,
      direction: "out",
      cents: p.cents,
      origin: "paid",
      href: spendsHref({ statut: "paye" }),
    }),
  );
  installmentsPaid(engines, addDays(first, -1), today).forEach((p, i) =>
    put(p.day, {
      ...real,
      key: `plp-${p.day}-${i}`,
      label: t.installmentLabel,
      direction: "out",
      cents: p.cents,
      origin: "pay_later",
      href: routes.financeFundings,
    }),
  );
  for (const e of treasury?.events ?? []) put(e.day, forecastMove(e));

  // End-of-day balances; on today, the forecast's point comes after the real.
  const end = new Map<string, number>();
  for (const p of treasury?.points ?? []) end.set(p.day, p.cents);
  const reserve = treasury?.reserveCents ?? 0;
  const low =
    treasury && treasury.low.cents < treasury.todayCents ? treasury.low : null;

  return days.map((day) => {
    const own = moves.get(day) ?? [];
    const sum = (direction: "in" | "out") =>
      own
        .filter((m) => m.direction === direction)
        .reduce((s, m) => s + m.cents, 0);
    const beforeCents = end.get(addDays(day, -1)) ?? null;
    const afterCents = end.get(day) ?? null;
    const below =
      Boolean(treasury) && afterCents !== null && afterCents < reserve;
    const marks: PlanningMark[] = [];
    if (below && beforeCents !== null && beforeCents >= reserve)
      marks.push("reserve");
    if (low?.day === day) marks.push(below ? "low_under" : "low");
    return {
      day,
      moves: own,
      inCents: sum("in"),
      outCents: sum("out"),
      beforeCents,
      afterCents,
      belowReserve: below,
      marks,
    };
  });
}

/** "YYYY-MM" from the URL, or null. */
export function asMonth(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    return null;
  return value;
}

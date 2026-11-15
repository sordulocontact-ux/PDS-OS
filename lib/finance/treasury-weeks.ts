// The money in and out of the treasury's chart, week by week (Sacha's
// Figma, 15/11/2026: money in above the line, out below, the forecast
// lighter, the balance over them). What happened up to today (receipts of
// incomes, spends paid) then what the forecast counts until the horizon:
// the same figures as the calendar. Client-safe, pure code.
import type { PaidDay, TreasuryEvent } from "@/lib/finance/treasury";

export type TreasuryWeek = {
  // Monday, and the last day shown of the week.
  start: string;
  end: string;
  inCents: number;
  outCents: number;
  // Of which still forecast (after today, or late and counted today).
  inAheadCents: number;
  outAheadCents: number;
};

const DAY = 86400000;
const add = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);
const monday = (day: string) => {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return add(day, -weekday);
};

export function treasuryWeeks({
  from,
  until,
  today,
  receipts,
  paid,
  events,
}: {
  from: string;
  until: string;
  today: string;
  receipts: PaidDay[];
  paid: PaidDay[];
  events: Pick<TreasuryEvent, "day" | "direction" | "cents">[];
}): TreasuryWeek[] {
  const weeks: TreasuryWeek[] = [];
  for (let start = monday(from); start <= until; start = add(start, 7)) {
    const end = add(start, 6) > until ? until : add(start, 6);
    weeks.push({
      start: start < from ? from : start,
      end,
      inCents: 0,
      outCents: 0,
      inAheadCents: 0,
      outAheadCents: 0,
    });
  }
  const weekOf = (day: string) =>
    weeks.find((w) => day >= w.start && day <= w.end);
  const count = (
    day: string,
    side: "in" | "out",
    cents: number,
    ahead: boolean,
  ) => {
    const week = weekOf(day);
    if (!week) return;
    if (side === "in") {
      week.inCents += cents;
      if (ahead) week.inAheadCents += cents;
    } else {
      week.outCents += cents;
      if (ahead) week.outAheadCents += cents;
    }
  };
  for (const r of receipts)
    if (r.day <= today) count(r.day, "in", r.cents, false);
  for (const p of paid) if (p.day <= today) count(p.day, "out", p.cents, false);
  for (const e of events) count(e.day, e.direction, e.cents, true);
  return weeks;
}

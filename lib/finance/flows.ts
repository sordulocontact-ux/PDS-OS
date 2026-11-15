// « Entrées et sorties » of Finance › Trésorerie (new style, after the
// proto's Rapports page, Sacha 15/11/2026): money in and out by month, what
// happened before today (receipts of incomes, spends paid) then what the
// forecast counts until the horizon. Client-safe, pure code.
import type { PaidDay, Treasury } from "@/lib/finance/treasury";

export type MonthFlow = {
  // "2026-11"
  month: string;
  inCents: number;
  outCents: number;
  // After this month: forecast only.
  ahead: boolean;
};

const monthOf = (day: string) => day.slice(0, 7);

function addMonths(month: string, count: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + count, 1));
  return d.toISOString().slice(0, 7);
}

export function monthFlows({
  receipts,
  paid,
  treasury,
  today,
  before = 3,
}: {
  receipts: PaidDay[];
  paid: PaidDay[];
  treasury: Treasury | null;
  today: string;
  // How many past months to show before the current one.
  before?: number;
}): MonthFlow[] {
  const now = monthOf(today);
  const last = treasury?.events.length
    ? treasury.events.reduce(
        (m, e) => (monthOf(e.day) > m ? monthOf(e.day) : m),
        now,
      )
    : now;
  const months: string[] = [];
  for (let m = addMonths(now, -before); m <= last; m = addMonths(m, 1))
    months.push(m);
  const flows = new Map(
    months.map((month) => [
      month,
      { month, inCents: 0, outCents: 0, ahead: month > now },
    ]),
  );
  const add = (day: string, side: "inCents" | "outCents", cents: number) => {
    const flow = flows.get(monthOf(day));
    if (flow) flow[side] += cents;
  };
  for (const r of receipts) if (r.day <= today) add(r.day, "inCents", r.cents);
  for (const p of paid) if (p.day <= today) add(p.day, "outCents", p.cents);
  for (const e of treasury?.events ?? [])
    add(e.day, e.direction === "in" ? "inCents" : "outCents", e.cents);
  return [...flows.values()];
}

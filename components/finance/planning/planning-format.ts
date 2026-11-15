// How a day of Finance › Planning is said: its long name and what a screen
// reader hears on it. Client-safe.
import type { PlanningDay } from "@/lib/finance/planning";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";
import { formatAmount } from "@/lib/utils/money";

const t = financePlanning;

const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export const amount = (cents: number) => formatAmount(cents, { ht: false });

/** « Lundi 16 novembre 2026 ». */
export function dayName(day: string): string {
  const text = longDay.format(new Date(`${day}T00:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The balance shown under a day: only when it moves that day. */
export const shownBalance = (d: PlanningDay) =>
  d.afterCents !== null && d.afterCents !== d.beforeCents ? d.afterCents : null;

/** A day as a screen reader says it, with its figures and marks. */
export function dayLabel(d: PlanningDay): string {
  const balance = shownBalance(d);
  return t.day({
    name: dayName(d.day),
    count: d.moves.length,
    lates: d.moves.filter((m) => m.dueOn).length,
    inAmount: d.inCents > 0 ? `+${amount(d.inCents)}` : null,
    outAmount: d.outCents > 0 ? `−${amount(d.outCents)}` : null,
    balance: balance === null ? null : amount(balance),
    marks: d.marks.map((m) => t.marks[m]),
  });
}

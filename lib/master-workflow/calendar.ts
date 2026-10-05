// The calendar the Brief proposes from the master final's date (ticket § 5):
// computed by code, applied or changed by a person. The offsets are those of
// the ticket's example (master final 10 → Mix V1 4, Mix final 7, Master 9),
// in calendar days. Pure.

import type { BriefDate } from "@/lib/master-workflow/brief-types";

const DAYS_BEFORE_MASTER_FINAL: Record<
  Exclude<BriefDate, "masterFinalDue">,
  number
> = {
  mixV1Due: 6,
  mixFinalDue: 3,
  masteringDue: 1,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-10" minus `days`, as a "YYYY-MM-DD" date (UTC, no time zone). */
function daysBefore(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

/** The three dates to propose before a master final; null without it. */
export function proposeMasterCalendar(
  masterFinalDue: string | null,
): Record<Exclude<BriefDate, "masterFinalDue">, string> | null {
  if (!masterFinalDue || !isIsoDate(masterFinalDue)) return null;
  return {
    mixV1Due: daysBefore(masterFinalDue, DAYS_BEFORE_MASTER_FINAL.mixV1Due),
    mixFinalDue: daysBefore(
      masterFinalDue,
      DAYS_BEFORE_MASTER_FINAL.mixFinalDue,
    ),
    masteringDue: daysBefore(
      masterFinalDue,
      DAYS_BEFORE_MASTER_FINAL.masteringDue,
    ),
  };
}

/** The dates given in order (Mix V1 ≤ Mix final ≤ Mastering ≤ Master
 * final, the empty ones skipped): what the database checks too. */
export function calendarInOrder(
  dates: Record<BriefDate, string | null>,
): boolean {
  const given = [
    dates.mixV1Due,
    dates.mixFinalDue,
    dates.masteringDue,
    dates.masterFinalDue,
  ].filter((date): date is string => Boolean(date));
  return given.every((date, index) => index === 0 || given[index - 1] <= date);
}

/**
 * Days and periods of a calendar, computed by code on Paris time (the
 * team's zone): which day and minute an instant falls on, a week or a month
 * laid out as Teams does. Shared by the Calls page and the Calendrier.
 * Client-safe.
 */
const ZONE = "Europe/Paris";
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const partsFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The Paris day ("YYYY-MM-DD") and minute of the day of an instant. */
export function parisPlace(instant: Date): { day: string; minute: number } {
  const p = Object.fromEntries(
    partsFormat.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    minute: Number(p.hour) * 60 + Number(p.minute),
  };
}

// Days as UTC dates: arithmetic without any zone or summer time.
const utcOf = (day: string) => {
  const [, y, m, d] = DATE.exec(day) ?? [];
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
};
const dayOf = (utc: number) => new Date(utc).toISOString().slice(0, 10);

export function addDays(day: string, count: number): string {
  return dayOf(utcOf(day) + count * DAY_MS);
}

/** Days from one "YYYY-MM-DD" to another (negative when `to` is before). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcOf(to) - utcOf(from)) / DAY_MS);
}

/** The Monday of a day's week. */
export function weekStartOf(day: string): string {
  const weekday = (new Date(utcOf(day)).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
}

/** A valid "YYYY-MM-DD" from the URL, or null. */
export function asDay(value: unknown): string | null {
  if (typeof value !== "string" || !DATE.test(value)) return null;
  return dayOf(utcOf(value)) === value ? value : null;
}

/** The instant of a Paris midnight. */
export function parisMidnight(day: string): Date {
  const guess = utcOf(day);
  // Paris is ahead of UTC: read the offset at that moment, then step back.
  const { day: placeDay, minute } = parisPlace(new Date(guess));
  const offset = (utcOf(placeDay) - guess) / 60_000 + minute;
  return new Date(guess - offset * 60_000);
}

/** The instant of a Paris day and minute (summer time included). */
export function parisInstant(day: string, minute: number): Date {
  const guess = new Date(parisMidnight(day).getTime() + minute * 60_000);
  // A change of summer time that day shifts the clock: corrected once.
  const drift = parisPlace(guess);
  const shown =
    drift.day === day
      ? drift.minute
      : drift.minute + (drift.day > day ? 1440 : -1440);
  return new Date(guess.getTime() + (minute - shown) * 60_000);
}

// Week and month only (Sacha, 10/10/2026: no day nor work week).
export const CALENDAR_MODES = ["week", "month"] as const;
export type CalendarMode = (typeof CALENDAR_MODES)[number];

// The Calls open on the week (Teams), the Calendrier on the month.
export function asCalendarMode(
  value: unknown,
  fallback: CalendarMode = "week",
): CalendarMode {
  return CALENDAR_MODES.find((mode) => mode === value) ?? fallback;
}

export type CalendarPeriod = {
  mode: CalendarMode;
  // The day the period is read around (in the URL).
  date: string;
  // The days drawn, in order (a month: whole weeks around it).
  days: string[];
  // The neighbouring periods' dates.
  previous: string;
  next: string;
};

const firstOfMonth = (day: string) => `${day.slice(0, 7)}-01`;
function shiftMonth(day: string, count: number): string {
  const [y, m] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + count, 1));
  return date.toISOString().slice(0, 10);
}

/** The days of a period of the calendar, as Teams lays them out. */
export function periodOf(mode: CalendarMode, date: string): CalendarPeriod {
  const range = (from: string, count: number) =>
    Array.from({ length: count }, (_, i) => addDays(from, i));
  if (mode === "month") {
    const first = firstOfMonth(date);
    const last = addDays(shiftMonth(first, 1), -1);
    const start = weekStartOf(first);
    const weeks = Math.ceil(
      (utcOf(last) - utcOf(start) + DAY_MS) / (7 * DAY_MS),
    );
    return {
      mode,
      date,
      days: range(start, weeks * 7),
      previous: shiftMonth(first, -1),
      next: shiftMonth(first, 1),
    };
  }
  const monday = weekStartOf(date);
  return {
    mode,
    date,
    days: range(monday, 7),
    previous: addDays(monday, -7),
    next: addDays(monday, 7),
  };
}

/** The instants the period covers, for the query. */
export function periodRange(period: CalendarPeriod): { from: Date; to: Date } {
  return {
    from: parisMidnight(period.days[0]),
    to: parisMidnight(addDays(period.days[period.days.length - 1], 1)),
  };
}

/** "14:30" from minutes of the day. */
export function clock(minutes: number): string {
  const m = Math.min(minutes, 24 * 60 - 1);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

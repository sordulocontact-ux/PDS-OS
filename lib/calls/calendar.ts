/**
 * The week calendar of the Calls page, computed by code on Paris time (the
 * team's zone): which day and minute each call falls on, the hours to show,
 * and how overlapping calls share a day's width.
 */
import { callEndOf, isUpcoming } from "@/lib/calls/format";
import type { CallListItem } from "@/lib/calls/queries";

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

export type CalendarEvent = {
  call: CallListItem;
  // The Paris day it starts on, and its minutes there (end clamped to midnight).
  day: string;
  start: number;
  end: number;
  upcoming: boolean;
  // Whoever works on it may move it: its owner, and nothing recorded yet.
  editable: boolean;
  // Side by side when several overlap: this one's column, out of `columns`.
  column: number;
  columns: number;
};

// Week and month only (Sacha, 10/10/2026: no day nor work week).
export const CALENDAR_MODES = ["week", "month"] as const;
export type CalendarMode = (typeof CALENDAR_MODES)[number];

export function asCalendarMode(value: unknown): CalendarMode {
  return CALENDAR_MODES.find((mode) => mode === value) ?? "week";
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

// Shortest block drawn, so a 5-minute call stays readable.
const MIN_BLOCK = 20;

/** The calls placed on their Paris day and minutes. `mePersonId`: who reads. */
export function placeCalls(
  calls: CallListItem[],
  now: Date,
  mePersonId: string | null,
): CalendarEvent[] {
  return calls.map((call) => {
    const place = parisPlace(new Date(call.occurredAt));
    const endPlace = parisPlace(new Date(callEndOf(call)));
    const end = endPlace.day === place.day ? endPlace.minute : 24 * 60;
    return {
      call,
      day: place.day,
      start: place.minute,
      end: Math.min(24 * 60, Math.max(end, place.minute + MIN_BLOCK)),
      upcoming: isUpcoming(call, now),
      editable:
        mePersonId !== null &&
        call.ownerPersonId === mePersonId &&
        call.status === "draft",
      column: 0,
      columns: 1,
    };
  });
}

/** One day's events, laid out side by side where they overlap. */
export function dayEvents(
  events: CalendarEvent[],
  day: string,
): CalendarEvent[] {
  const own = events
    .filter((e) => e.day === day)
    .map((e) => ({ ...e, column: 0, columns: 1 }));
  layOut(own);
  return own;
}

/** Overlapping events share the width: each group of overlaps gets as many
 * columns as it needs, each event the first one free. */
function layOut(events: CalendarEvent[]): void {
  events.sort((a, b) => a.start - b.start || b.end - a.end);
  let group: CalendarEvent[] = [];
  let groupEnd = -1;
  const close = () => {
    const columns = Math.max(1, ...group.map((e) => e.column + 1));
    for (const event of group) event.columns = columns;
    group = [];
  };
  for (const event of events) {
    if (event.start >= groupEnd) {
      close();
      groupEnd = event.end;
    } else groupEnd = Math.max(groupEnd, event.end);
    const taken = new Set(
      group.filter((e) => e.end > event.start).map((e) => e.column),
    );
    let column = 0;
    while (taken.has(column)) column += 1;
    event.column = column;
    group.push(event);
  }
  close();
}

/**
 * The week calendar of the Calls page, computed by code on Paris time (the
 * team's zone, lib/utils/calendar-period.ts): which day and minute each call
 * falls on, and how overlapping calls share a day's width.
 */
import { callEndOf, isUpcoming } from "@/lib/calls/format";
import type { CallListItem } from "@/lib/calls/queries";
import { parisPlace } from "@/lib/utils/calendar-period";

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

"use client";

import { useState } from "react";

import { CalendarEntry } from "@/components/calendar/calendar-item";
import { AgendaList } from "@/components/calls/calendar/agenda-list";
import { EventPeek } from "@/components/calls/calendar/event-peek";
import { MonthGrid } from "@/components/calls/calendar/month-grid";
import { RescheduleDialog } from "@/components/calls/calendar/reschedule-dialog";
import { TimeGrid, type TimeMark } from "@/components/calls/calendar/time-grid";
import { useReschedule } from "@/components/calls/calendar/use-reschedule";
import { useMeetingComposer } from "@/components/calls/new-meeting-button";
import type { CalendarItem } from "@/lib/calendar/items";
import type { CalendarEvent } from "@/lib/calls/calendar";
import { clock, type CalendarMode } from "@/lib/utils/calendar-period";

type Place = { day: string; start: number; end: number };

// A date with an hour but no end (a shoot) takes an hour of the grid.
const MARK_MINUTES = 60;

/**
 * The calendar of the calls, as in Teams: the week's time grid or the month,
 * where a click or a drag on a free slot opens « Nouvelle réunion » on it, a
 * drag moves or stretches one of your calls (saved at once, put back if
 * refused), a click opens the call's card. In the Calendrier's week, the
 * other dates come along (`items`): those with an hour (a shoot) on their
 * slot, the others above the hours; each opens where it is decided. Phones
 * read the period as an agenda. Places and permissions come from the server
 * (lib/calls/calendar.ts).
 */
export function CallsCalendar({
  mode,
  days,
  month,
  events,
  items = [],
  today,
  weekHrefs = {},
}: {
  mode: CalendarMode;
  days: string[];
  month: string;
  events: CalendarEvent[];
  // The week's other dates (Calendrier).
  items?: CalendarItem[];
  today: { day: string; minute: number };
  // The week view around each day of a month (its number, « n autres »).
  weekHrefs?: Record<string, string>;
}) {
  const composer = useMeetingComposer();
  const { shown, move } = useReschedule(events);
  const [peek, setPeek] = useState<{
    event: CalendarEvent;
    anchor: HTMLElement;
  } | null>(null);
  const [rescheduling, setRescheduling] = useState<CalendarEvent | null>(null);

  const create = (place: Place) =>
    composer.open({
      date: place.day,
      start: clock(place.start),
      end: clock(place.end),
    });
  const open = (event: CalendarEvent, anchor: HTMLElement) =>
    setPeek({ event, anchor });
  const weekHref = (day: string) => weekHrefs[day] ?? "";
  const entry = (item: CalendarItem, className?: string) => (
    <CalendarEntry
      key={item.key}
      item={item}
      past={item.day < today.day}
      compact
      className={className}
    />
  );
  const marks: TimeMark[] = items.flatMap((item) =>
    item.minute === null
      ? []
      : [
          {
            key: item.key,
            day: item.day,
            start: item.minute,
            end: Math.min(24 * 60, item.minute + MARK_MINUTES),
            node: entry(item, "h-full overflow-hidden"),
          },
        ],
  );
  const dayLong = items.filter((item) => item.minute === null);

  return (
    <>
      <div className="hidden md:block">
        {mode === "month" ? (
          <MonthGrid
            days={days}
            month={month}
            events={shown}
            today={today.day}
            weekHref={weekHref}
            onCreate={create}
            onMove={move}
            onOpen={open}
          />
        ) : (
          <TimeGrid
            days={days}
            events={shown}
            marks={marks}
            allDay={
              dayLong.length > 0
                ? (day) =>
                    dayLong
                      .filter((item) => item.day === day)
                      .map((item) => entry(item))
                : undefined
            }
            today={today}
            onCreate={create}
            onMove={move}
            onOpen={open}
          />
        )}
      </div>
      <div className="md:hidden">
        <AgendaList
          days={days}
          events={shown}
          today={today.day}
          skipEmpty={mode === "month"}
        />
      </div>
      <EventPeek
        peek={peek}
        onClose={() => setPeek(null)}
        onReschedule={(event) => {
          setPeek(null);
          setRescheduling(event);
        }}
      />
      <RescheduleDialog
        event={rescheduling}
        onClose={() => setRescheduling(null)}
        onSave={move}
      />
    </>
  );
}

"use client";

import { useState } from "react";

import { AgendaList } from "@/components/calls/calendar/agenda-list";
import { EventPeek } from "@/components/calls/calendar/event-peek";
import { MonthGrid } from "@/components/calls/calendar/month-grid";
import { RescheduleDialog } from "@/components/calls/calendar/reschedule-dialog";
import { TimeGrid } from "@/components/calls/calendar/time-grid";
import { useReschedule } from "@/components/calls/calendar/use-reschedule";
import { useMeetingComposer } from "@/components/calls/new-meeting-button";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CalendarEvent } from "@/lib/calls/calendar";
import { clock, type CalendarMode } from "@/lib/utils/calendar-period";
import { calls } from "@/lib/i18n/fr/calls";
import { callCalendarTone } from "@/lib/ui/state-tones";

const fr = { calls };

type Place = { day: string; start: number; end: number };

// What the blocks' colours say (proto `docs/protos/pages.html`).
const LEGEND = ["ready", "upcoming", "draft"] as const;

/**
 * The Calls page's calendar, as in Teams: the week's time grid or the month, where a click or a drag on a free slot opens « Nouvelle
 * réunion » on it, a drag moves or stretches one of your calls (saved at
 * once, put back if refused), a click opens the call's card. Phones read the
 * period as an agenda. Places and permissions come from the server
 * (lib/calls/calendar.ts).
 */
export function CallsCalendar({
  mode,
  days,
  month,
  events,
  today,
  weekHrefs,
}: {
  mode: CalendarMode;
  days: string[];
  month: string;
  events: CalendarEvent[];
  today: { day: string; minute: number };
  // The week view around each day of a month (its number, « n autres »).
  weekHrefs: Record<string, string>;
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

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="hidden text-xs text-muted-foreground md:block">
          {mode === "month"
            ? fr.calls.calendar.hintMonth
            : fr.calls.calendar.hint}
        </p>
        <ul
          aria-label={fr.calls.calendar.legend}
          className="flex flex-wrap items-center gap-1.5"
        >
          {LEGEND.map((key) => (
            <li key={key}>
              <StatusBadge tone={callCalendarTone[key]} size="sm">
                {fr.calls.status[key]}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </div>
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

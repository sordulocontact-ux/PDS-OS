import Link from "next/link";

import type { CalendarEvent } from "@/lib/calls/calendar";
import { callEndOf, callStateKey, formatTime } from "@/lib/calls/format";
import { calls } from "@/lib/i18n/fr/calls";
import { callCalendarTone, type Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { clock } from "@/lib/utils/calendar-period";

const fr = { calls };

// Tall enough (in minutes) to show the project under the title and time;
// below COMPACT_MINUTES, title and start share one line.
const ROOMY_MINUTES = 50;
const COMPACT_MINUTES = 45;

export function eventTime(event: CalendarEvent): string {
  return fr.calls.calendar.timeRange(
    formatTime(event.call.occurredAt),
    formatTime(callEndOf(event.call)),
  );
}

export function eventLabel(event: CalendarEvent): string {
  const t = fr.calls.calendar;
  return t.eventLabel(
    event.call.title,
    eventTime(event),
    event.call.projectTitle ?? t.internal,
  );
}

// The surface of each tone (lib/ui/state-tones.ts), as StatusBadge paints it.
const toneSurface: Record<Tone, string> = {
  neutral: "bg-[var(--tone-neutral-bg)] text-[color:var(--tone-neutral-fg)]",
  info: "bg-[var(--tone-info-bg)] text-[color:var(--tone-info-fg)]",
  warning: "bg-[var(--tone-warning-bg)] text-[color:var(--tone-warning-fg)]",
  success: "bg-[var(--tone-success-bg)] text-[color:var(--tone-success-fg)]",
  danger: "bg-[var(--tone-danger-bg)] text-[color:var(--tone-danger-fg)]",
  action: "bg-[var(--tone-action-bg)] text-[color:var(--tone-action-fg)]",
};

/** The state a block is painted with (its legend: CallsCalendar). */
const eventTone = (event: CalendarEvent): Tone =>
  callCalendarTone[
    callStateKey(event.call.status, {
      upcoming: event.upcoming,
      closed: event.call.closed,
    })
  ];

/** The block's surface: the call's state (proto `docs/protos/pages.html`:
 * report ready, to come, to record), quieter once over. */
export function eventClass(event: CalendarEvent): string {
  return cn(
    toneSurface[eventTone(event)],
    "flex min-w-0 flex-col overflow-hidden rounded-md px-2 py-1 text-left text-xs transition-shadow duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
    "[@media(hover:hover)]:hover:shadow-elevation-1",
    !event.upcoming && "opacity-70",
  );
}

/**
 * What a call's block says: title, time, and its project when there is room.
 * The times follow the block while it is dragged (`start`, `end`).
 */
export function EventContent({
  event,
  inline = false,
}: {
  event: CalendarEvent;
  inline?: boolean;
}) {
  const t = fr.calls.calendar;
  const length = event.end - event.start;
  const where = event.call.projectTitle ?? t.internal;
  if (!inline && length < COMPACT_MINUTES)
    return (
      <span className="truncate">
        <span className="font-semibold">{event.call.title}</span>
        <span className="tabular-nums">
          {" · "}
          {clock(event.start)}
        </span>
      </span>
    );
  return (
    <>
      <span className="line-clamp-2 shrink-0 font-semibold break-words">
        {event.call.title}
      </span>
      <span className="shrink-0 tabular-nums">
        {t.timeRange(clock(event.start), clock(event.end))}
      </span>
      {(inline || length >= ROOMY_MINUTES) && (
        <span className="truncate">{where}</span>
      )}
    </>
  );
}

/** A call of the phone's day list: opens the call's page. */
export function CalendarEventLink({ event }: { event: CalendarEvent }) {
  return (
    <Link
      href={event.call.href}
      aria-label={eventLabel(event)}
      className={cn(
        eventClass(event),
        "min-h-11 justify-center gap-0.5 py-2 text-sm",
      )}
    >
      <EventContent event={event} inline />
    </Link>
  );
}

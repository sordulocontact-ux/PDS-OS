import Link from "next/link";

import type { CalendarEvent } from "@/lib/calls/calendar";
import { callEndOf, formatTime } from "@/lib/calls/format";
import { calls } from "@/lib/i18n/fr/calls";
import { hueClass, projectHue } from "@/lib/ui/category-hues";
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

/** The block's surface: its project's hue, quieter once over. */
export function eventClass(event: CalendarEvent): string {
  return cn(
    hueClass[projectHue(event.call.projectId)],
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

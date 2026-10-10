"use client";

import { useEffect, useRef } from "react";

import {
  clock,
  eventClass,
  eventLabel,
  EventContent,
} from "@/components/calls/calendar-event";
import {
  useGridDrag,
  type GridPreview,
} from "@/components/calls/calendar/use-grid-drag";
import { dayEvents, type CalendarEvent } from "@/lib/calls/calendar";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
// Scrolled to on arrival: just before the working day, or the earliest call.
const ARRIVAL_MINUTE = 7 * 60 + 30;

const utc = (day: string) => new Date(`${day}T00:00:00Z`);
const weekday = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  timeZone: "UTC",
});
const dayNumber = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  timeZone: "UTC",
});

type Place = { day: string; start: number; end: number };

// The hours' column, then the seven days.
const columnsClass =
  "grid grid-cols-[var(--calendar-gutter)_repeat(7,minmax(0,1fr))]";

// Geometry computed by code; the hour's height is a token.
const at = (minute: number) => `calc(${minute / 60} * var(--calendar-hour))`;

/**
 * The calendar's week, as in Teams: 24 hours scrolled to the working day,
 * a column per day,
 * the calls side by side where they overlap, today's line. Click or drag on
 * a free slot to create; drag a call to move it, its bottom edge to stretch
 * it; click a call to open its card.
 */
export function TimeGrid({
  days,
  events,
  today,
  onCreate,
  onMove,
  onOpen,
}: {
  days: string[];
  events: CalendarEvent[];
  today: { day: string; minute: number };
  onCreate: (place: Place) => void;
  onMove: (event: CalendarEvent, place: Place) => void;
  onOpen: (event: CalendarEvent, anchor: HTMLElement) => void;
}) {
  const t = fr.calls.calendar;
  const scroller = useRef<HTMLDivElement>(null);
  const hourCell = useRef<HTMLDivElement>(null);
  const columns = useRef(new Map<string, HTMLElement>());
  const hourPx = () => hourCell.current?.offsetHeight ?? 48;
  const drag = useGridDrag({
    days,
    columnOf: (day) => columns.current.get(day) ?? null,
    hourPx,
    onDraw: onCreate,
    onMove,
  });

  // On arrival and on each new period: the working day in view.
  const earliest = Math.min(ARRIVAL_MINUTE, ...events.map((e) => e.start - 30));
  useEffect(() => {
    if (scroller.current)
      scroller.current.scrollTop = (Math.max(0, earliest) / 60) * hourPx();
    // Only when the period changes, not on every move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.join()]);

  // The dragged call is drawn where it would land.
  const preview = drag.preview;
  const placed = events.map((e) =>
    preview && preview.kind !== "draw" && preview.callId === e.call.id
      ? { ...e, day: preview.day, start: preview.start, end: preview.end }
      : e,
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card",
        preview && "select-none",
        preview?.kind === "move" && "cursor-grabbing",
        preview?.kind === "resize" && "cursor-ns-resize",
      )}
    >
      <div
        ref={scroller}
        className="max-h-[var(--calendar-viewport)] overflow-y-auto overscroll-contain"
      >
        <div
          className={cn(
            columnsClass,
            "sticky top-0 z-20 border-b border-[color:var(--border-hairline)] bg-card",
          )}
        >
          <span aria-hidden />
          {days.map((day) => (
            <div
              key={day}
              aria-current={day === today.day ? "date" : undefined}
              className="flex flex-col items-center gap-0.5 py-2"
            >
              <span className="text-xs text-muted-foreground">
                {weekday.format(utc(day))}
              </span>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-[var(--radius-circle)] text-sm font-semibold tabular-nums",
                  day === today.day && "bg-foreground text-background",
                )}
              >
                {dayNumber.format(utc(day))}
              </span>
            </div>
          ))}
        </div>
        <div className={columnsClass}>
          <div aria-hidden>
            {HOURS.map((hour) => (
              <div
                key={hour}
                ref={hour === 0 ? hourCell : undefined}
                className="relative h-[var(--calendar-hour)] pr-2 text-right text-xs text-muted-foreground tabular-nums"
              >
                {hour > 0 && (
                  <span className="absolute top-0 right-2 -translate-y-1/2">
                    {clock(hour * 60)}
                  </span>
                )}
              </div>
            ))}
          </div>
          {days.map((day) => (
            <div
              key={day}
              ref={(el) => {
                if (el) columns.current.set(day, el);
                else columns.current.delete(day);
              }}
              onPointerDown={(e) => drag.pressColumn(day, e)}
              className="relative cursor-cell border-l border-[color:var(--border-hairline)]"
            >
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  aria-hidden
                  className="pointer-events-none h-[var(--calendar-hour)] border-t border-[color:var(--border-hairline)] first:border-t-0"
                />
              ))}
              <ol className="pointer-events-none absolute inset-0">
                {dayEvents(placed, day).map((event) => (
                  <li
                    key={event.call.id}
                    className={cn(
                      "pointer-events-auto absolute px-0.5",
                      preview?.kind !== "draw" &&
                        preview?.callId === event.call.id &&
                        "z-10",
                    )}
                    style={{
                      top: at(event.start),
                      height: at(event.end - event.start),
                      left: `${(event.column / event.columns) * 100}%`,
                      width: `${100 / event.columns}%`,
                    }}
                  >
                    <GridEvent
                      event={event}
                      dragging={
                        preview?.kind !== "draw" &&
                        preview?.callId === event.call.id
                      }
                      onPointerDown={(e) => drag.pressEvent(event, e)}
                      onClick={(e) => {
                        if (!drag.consumeDragClick())
                          onOpen(event, e.currentTarget);
                      }}
                    />
                  </li>
                ))}
              </ol>
              {preview?.kind === "draw" && preview.day === day && (
                <DrawnSlot preview={preview} />
              )}
              {day === today.day && (
                <div
                  role="img"
                  aria-label={t.now}
                  className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-selection"
                  style={{ top: at(today.minute) }}
                >
                  <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-[var(--radius-circle)] bg-selection" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GridEvent({
  event,
  dragging,
  onPointerDown,
  onClick,
}: {
  event: CalendarEvent;
  dragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={eventLabel(event)}
      aria-haspopup="dialog"
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={cn(
        eventClass(event),
        "relative h-full w-full",
        event.editable && "cursor-grab",
        dragging && "shadow-elevation-1 ring-2 ring-selection",
      )}
    >
      <EventContent event={event} />
      {event.editable && (
        <span
          data-resize
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
        />
      )}
    </button>
  );
}

/** The slot being drawn: where the new meeting will go. */
function DrawnSlot({ preview }: { preview: GridPreview }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0.5 z-10 rounded-md border border-selection bg-selection-bg px-2 py-1 text-xs font-medium text-selection"
      style={{
        top: at(preview.start),
        height: at(preview.end - preview.start),
      }}
    >
      {fr.calls.calendar.newSlot(
        fr.calls.calendar.timeRange(clock(preview.start), clock(preview.end)),
      )}
    </div>
  );
}

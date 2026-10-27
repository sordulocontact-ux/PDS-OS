"use client";

import { useEffect, useRef, useState } from "react";

import { eventClass, eventLabel } from "@/components/calls/calendar-event";
import { ViewLink } from "@/components/ui/view-link";
import type { CalendarEvent } from "@/lib/calls/calendar";
import { calls } from "@/lib/i18n/fr/calls";
import { cn } from "@/lib/utils";
import { clock } from "@/lib/utils/calendar-period";

const fr = { calls };

// Calls listed in a day before « n autres ».
const SHOWN = 3;
const DRAG_THRESHOLD = 4;
// A meeting created on a day starts at 9:00 (Teams), for half an hour.
const DEFAULT_START = 9 * 60;

const utc = (day: string) => new Date(`${day}T00:00:00Z`);
const weekday = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  timeZone: "UTC",
});
const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

type Place = { day: string; start: number; end: number };

/**
 * The month, as in Teams: whole weeks, the other months' days quieter.
 * Click a day to create a meeting on it, a call to open its card, « n
 * autres » or the day's number to open its week; drag one of your calls to
 * another day (same time).
 */
export function MonthGrid({
  days,
  month,
  events,
  today,
  weekHref,
  onCreate,
  onMove,
  onOpen,
}: {
  days: string[];
  // "YYYY-MM": the month read.
  month: string;
  events: CalendarEvent[];
  today: string;
  // The week view around a day (its number, « n autres »).
  weekHref: (day: string) => string;
  onCreate: (place: Place) => void;
  onMove: (event: CalendarEvent, place: Place) => void;
  onOpen: (event: CalendarEvent, anchor: HTMLElement) => void;
}) {
  const t = fr.calls.calendar;
  const [target, setTarget] = useState<{ id: string; day: string } | null>(
    null,
  );
  const drag = useRef<{
    event: CalendarEvent;
    x: number;
    y: number;
    moved: boolean;
    day: string;
  } | null>(null);
  const cleanup = useRef<() => void>(() => {});
  const swallowClick = useRef(false);
  useEffect(() => () => cleanup.current(), []);

  function press(event: CalendarEvent, e: React.PointerEvent) {
    if (e.button !== 0 || !event.editable || e.pointerType === "touch") return;
    drag.current = {
      event,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      day: event.day,
    };
    const move = (m: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      if (
        !d.moved &&
        Math.hypot(m.clientX - d.x, m.clientY - d.y) < DRAG_THRESHOLD
      )
        return;
      d.moved = true;
      const cell = document
        .elementFromPoint(m.clientX, m.clientY)
        ?.closest<HTMLElement>("[data-day]");
      if (cell?.dataset.day) d.day = cell.dataset.day;
      setTarget({ id: d.event.call.id, day: d.day });
    };
    const end = (commit: boolean) => {
      const d = drag.current;
      drag.current = null;
      cleanup.current();
      setTarget(null);
      if (commit && d?.moved) {
        swallowClick.current = true;
        setTimeout(() => {
          swallowClick.current = false;
        }, 0);
        onMove(d.event, { day: d.day, start: d.event.start, end: d.event.end });
      }
    };
    const up = () => end(true);
    const cancel = () => end(false);
    const key = (k: KeyboardEvent) => {
      if (k.key === "Escape") end(false);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    cleanup.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
    };
  }

  const placed = events.map((e) =>
    target?.id === e.call.id ? { ...e, day: target.day } : e,
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card",
        target && "cursor-grabbing select-none",
      )}
    >
      <div className="grid grid-cols-7 border-b border-[color:var(--border-hairline)]">
        {days.slice(0, 7).map((day) => (
          <span
            key={day}
            className="py-2 text-center text-xs text-muted-foreground"
          >
            {weekday.format(utc(day))}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const own = placed
            .filter((e) => e.day === day)
            .sort((a, b) => a.start - b.start);
          const outside = !day.startsWith(month);
          return (
            <div
              key={day}
              data-day={day}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                onCreate({
                  day,
                  start: DEFAULT_START,
                  end: DEFAULT_START + 30,
                });
              }}
              // A pointer shortcut; the header's button creates by keyboard.
              title={t.createOn(longDay.format(utc(day)))}
              className={cn(
                "flex min-h-28 cursor-cell flex-col gap-1 border-t border-l border-[color:var(--border-hairline)] p-1.5 [&:nth-child(7n+1)]:border-l-0",
                outside && "bg-[var(--surface-soft)]",
                target?.day === day && "bg-selection-bg",
              )}
            >
              <ViewLink
                href={weekHref(day)}
                aria-current={day === today ? "date" : undefined}
                className={cn(
                  "flex size-7 items-center justify-center self-start rounded-[var(--radius-circle)] text-xs font-semibold tabular-nums focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  outside && "text-muted-foreground",
                  day === today
                    ? "bg-foreground text-background"
                    : "[@media(hover:hover)]:hover:bg-[var(--control-bg-hover)]",
                )}
              >
                {Number(day.slice(8))}
              </ViewLink>
              {own.slice(0, SHOWN).map((event) => (
                <button
                  key={event.call.id}
                  type="button"
                  aria-label={eventLabel(event)}
                  aria-haspopup="dialog"
                  onPointerDown={(e) => press(event, e)}
                  onClick={(e) => {
                    if (swallowClick.current) return;
                    onOpen(event, e.currentTarget);
                  }}
                  className={cn(
                    eventClass(event),
                    "block truncate py-0.5",
                    event.editable && "cursor-grab",
                  )}
                >
                  <span className="tabular-nums">{clock(event.start)}</span>{" "}
                  <span className="font-semibold">{event.call.title}</span>
                </button>
              ))}
              {own.length > SHOWN && (
                <ViewLink
                  href={weekHref(day)}
                  className="self-start rounded-sm px-1 text-xs font-medium text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [@media(hover:hover)]:hover:text-foreground"
                >
                  {t.more(own.length - SHOWN)}
                </ViewLink>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { IconChevronLeft, IconChevronRight } from "nucleo-sharp-essential";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { datePicker } from "@/lib/i18n/fr/date-picker";
import { cn } from "@/lib/utils";
import {
  addDays,
  addMonths,
  inRange,
  monthGrid,
  monthOf,
  weekStart,
} from "@/lib/utils/date-input";

const fr = { datePicker };

const utc = (day: string) => new Date(`${day}T00:00:00Z`);
const monthTitle = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayName = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// The key → how far the active day moves (WAI-ARIA date picker grid).
function moved(day: string, event: KeyboardEvent): string | null {
  const year = event.shiftKey ? 12 : 1;
  switch (event.key) {
    case "ArrowLeft":
      return addDays(day, -1);
    case "ArrowRight":
      return addDays(day, 1);
    case "ArrowUp":
      return addDays(day, -7);
    case "ArrowDown":
      return addDays(day, 7);
    case "Home":
      return weekStart(day);
    case "End":
      return addDays(weekStart(day), 6);
    case "PageUp":
      return addMonths(day, -year);
    case "PageDown":
      return addMonths(day, year);
    default:
      return null;
  }
}

/**
 * One month of days, Monday first, six weeks always (no jump in height from a
 * month to the next). The chosen day takes the selection blue (docs/DESIGN.md
 * § 3 bis), today a dot under its number; days outside `min`/`max` (or not
 * `available`) can be reached by the keyboard but not chosen. Arrows, Home/End, PageUp/PageDown
 * (Shift: a year) move; Enter or Space chooses.
 */
export function Calendar({
  value,
  today,
  min,
  max,
  month,
  onMonthChange,
  onSelect,
  autoFocus = false,
  available,
}: {
  value: string;
  today: string;
  min?: string;
  max?: string;
  // First day of the month shown: the field opens it on its value.
  month: string;
  onMonthChange: (month: string) => void;
  onSelect: (day: string) => void;
  autoFocus?: boolean;
  // Only these days can be chosen (free slots, as in Calendly): they stand
  // out, every other day is struck like a day out of range.
  available?: (day: string) => boolean;
}) {
  const [active, setActive] = useState(() =>
    value && monthOf(value) === month ? value : monthOf(today) === month ? today : month,
  );
  const shown = monthOf(active) === month ? active : month;
  const grid = useRef<HTMLTableElement>(null);
  const keyed = useRef(autoFocus);

  // The keyboard keeps the focus on the active day, even across months.
  useEffect(() => {
    if (!keyed.current) return;
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${shown}"]`)
      ?.focus();
  }, [shown]);

  const go = (day: string) => {
    keyed.current = true;
    setActive(day);
    if (monthOf(day) !== month) onMonthChange(monthOf(day));
  };
  const turn = (delta: number) => {
    keyed.current = false;
    const next = addMonths(month, delta);
    setActive(next);
    onMonthChange(next);
  };

  const weeks = monthGrid(month).reduce<string[][]>((rows, day, i) => {
    if (i % 7 === 0) rows.push([]);
    rows[rows.length - 1].push(day);
    return rows;
  }, []);

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between gap-2 pl-2">
        <p
          aria-live="polite"
          className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold tracking-[var(--type-body-tracking)]"
        >
          {capitalize(monthTitle.format(utc(month)))}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={fr.datePicker.previousMonth}
            onClick={() => turn(-1)}
          >
            <IconChevronLeft aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={fr.datePicker.nextMonth}
            onClick={() => turn(1)}
          >
            <IconChevronRight aria-hidden />
          </Button>
        </div>
      </div>

      <table ref={grid} role="grid" className="border-collapse">
        <thead>
          <tr>
            {fr.datePicker.weekdays.map((letter, i) => (
              <th
                key={i}
                scope="col"
                abbr={fr.datePicker.weekdaysLong[i]}
                className="h-8 text-center text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-medium text-[color:var(--text-tertiary)]"
              >
                {letter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]}>
              {week.map((day) => {
                const outside = monthOf(day) !== month;
                const allowed =
                  inRange(day, min, max) && (available?.(day) ?? true);
                const selected = day === value;
                const isToday = day === today;
                return (
                  <td key={day} role="gridcell" aria-selected={selected} className="p-0.5">
                    <button
                      type="button"
                      data-day={day}
                      tabIndex={day === shown ? 0 : -1}
                      aria-label={dayName.format(utc(day))}
                      aria-current={isToday ? "date" : undefined}
                      aria-disabled={!allowed || undefined}
                      onClick={() => (allowed ? onSelect(day) : go(day))}
                      onKeyDown={(event) => {
                        const next = moved(day, event);
                        if (!next) return;
                        event.preventDefault();
                        go(next);
                      }}
                      className={cn(
                        "relative flex size-10 items-center justify-center rounded-lg border border-transparent text-[length:var(--type-body-sm)] font-medium tabular-nums outline-none [transition:var(--transition-control)] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[color:var(--focus-ring)]",
                        outside
                          ? "text-[color:var(--text-tertiary)]"
                          : "text-[color:var(--text-primary)]",
                        allowed
                          ? "cursor-pointer hover:bg-[var(--control-bg-hover)] active:bg-[var(--control-bg-pressed)]"
                          : "cursor-not-allowed text-[color:var(--text-muted)] line-through decoration-[color:var(--text-muted)]",
                        isToday && "font-semibold",
                        available && allowed && "font-semibold",
                        selected &&
                          "border-[color:var(--selection-border)] bg-[var(--selection-bg)] font-semibold text-[color:var(--text-primary)] hover:bg-[var(--selection-bg)]",
                      )}
                    >
                      {Number(day.slice(8))}
                      {isToday && (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full",
                            selected ? "bg-[var(--selection)]" : "bg-[var(--text-primary)]",
                          )}
                        />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

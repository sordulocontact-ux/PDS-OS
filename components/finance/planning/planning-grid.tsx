"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import type { PlanningDay } from "@/lib/finance/planning";
import { datePicker } from "@/lib/i18n/fr/date-picker";
import { cn } from "@/lib/utils";
import { addDays, weekStart } from "@/lib/utils/date-input";

import { PlanningCell, PlanningDayNumber } from "./planning-cell";
import { dayLabel } from "./planning-format";

const fr = { datePicker };

// The key → the day the focus goes to (WAI-ARIA grid).
function moved(day: string, key: string): string | null {
  switch (key) {
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
    default:
      return null;
  }
}

/**
 * The month as a grid, Monday first, whole weeks (the other months' days
 * empty and quieter). One day holds the focus (arrows, Home, End move it
 * inside the month); Enter, Space or a click opens a day with moves, on
 * the move clicked if any.
 */
export function PlanningGrid({
  label,
  cells,
  days,
  today,
  onOpen,
}: {
  label: string;
  // Every day drawn (whole weeks around the month).
  cells: string[];
  // The month's days, with their moves.
  days: PlanningDay[];
  today: string;
  onOpen: (day: string, move: string | null) => void;
}) {
  const grid = useRef<HTMLTableElement>(null);
  const byDay = new Map(days.map((d) => [d.day, d] as const));
  const first = days[0].day;
  const last = days[days.length - 1].day;
  const [cursor, setCursor] = useState(
    today >= first && today <= last ? today : first,
  );
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) =>
    cells.slice(i * 7, i * 7 + 7),
  );

  const go = (day: string) => {
    const next = day < first ? first : day > last ? last : day;
    setCursor(next);
    grid.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus();
  };
  const open = (d: PlanningDay, target: EventTarget | null) => {
    if (d.moves.length === 0) return;
    const move =
      target instanceof Element
        ? target.closest<HTMLElement>("[data-move]")?.dataset.move
        : undefined;
    onOpen(d.day, move ?? null);
  };
  const onKey = (d: PlanningDay, event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(d, null);
      return;
    }
    const next = moved(d.day, event.key);
    if (!next) return;
    event.preventDefault();
    go(next);
  };

  return (
    <table
      ref={grid}
      role="grid"
      aria-label={label}
      className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-lg border border-[color:var(--border-hairline)] bg-card"
    >
      <thead>
        <tr>
          {fr.datePicker.weekdaysLong.map((name) => (
            <th
              key={name}
              scope="col"
              abbr={name}
              className="border-b border-[color:var(--border-hairline)] py-2 text-center text-micro font-medium text-[color:var(--text-secondary)] first-letter:uppercase"
            >
              {name.slice(0, 3)}.
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0]}>
            {week.map((cell) => {
              const d = byDay.get(cell);
              const edge =
                "border-b border-l border-[color:var(--border-hairline)] align-top first:border-l-0 [tr:last-child>&]:border-b-0";
              if (!d)
                return (
                  <td
                    key={cell}
                    role="gridcell"
                    className={cn(edge, "bg-[var(--surface-soft)] p-1.5")}
                  >
                    <PlanningDayNumber day={cell} today={today} muted />
                  </td>
                );
              return (
                <td
                  key={cell}
                  role="gridcell"
                  data-day={cell}
                  tabIndex={cell === cursor ? 0 : -1}
                  aria-label={dayLabel(d)}
                  aria-haspopup={d.moves.length > 0 ? "dialog" : undefined}
                  onFocus={() => setCursor(cell)}
                  onClick={(e) => open(d, e.target)}
                  onKeyDown={(e) => onKey(d, e)}
                  className={cn(
                    edge,
                    "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]",
                    d.moves.length > 0 &&
                      "cursor-pointer [@media(hover:hover)]:hover:bg-[var(--control-bg-hover)]",
                  )}
                >
                  <PlanningCell day={d} today={today} />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

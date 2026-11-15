"use client";

import { useState } from "react";

import { FinanceSheet } from "@/components/finance/finance-sheet";
import { EmptyNote } from "@/components/shell/empty-state";
import type { PlanningDay } from "@/lib/finance/planning";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";

import { PlanningDaySheet } from "./planning-day-sheet";
import { dayName } from "./planning-format";
import { PlanningGrid } from "./planning-grid";
import { PlanningList } from "./planning-list";

const t = financePlanning;

/**
 * Finance › Planning's month: the grid from `lg`, a list of the days with
 * moves below (a phone, no sideways scroll). A day opens in Finance's side
 * sheet; ↑ ↓ go to the day with moves before or after.
 */
export function PlanningBoard({
  monthName,
  cells,
  days,
  today,
}: {
  // « novembre 2026 », for the screen readers' names.
  monthName: string;
  cells: string[];
  days: PlanningDay[];
  today: string;
}) {
  const active = days.filter((d) => d.moves.length > 0);
  // The day stays drawn while the sheet closes.
  const [open, setOpen] = useState<{
    day: string;
    move: string | null;
    shown: boolean;
  } | null>(null);
  const index = open ? active.findIndex((d) => d.day === open.day) : -1;
  const shown = index >= 0 ? active[index] : null;
  const onOpen = (day: string, move: string | null) =>
    setOpen({ day, move, shown: true });

  return (
    <>
      <div className="hidden lg:block">
        <PlanningGrid
          label={t.grid(monthName)}
          cells={cells}
          days={days}
          today={today}
          onOpen={onOpen}
        />
      </div>
      <div className="lg:hidden">
        {active.length === 0 ? (
          <EmptyNote>{t.empty}</EmptyNote>
        ) : (
          <PlanningList
            label={t.list(monthName)}
            days={active}
            today={today}
            onOpen={onOpen}
          />
        )}
      </div>
      <FinanceSheet
        open={shown !== null && Boolean(open?.shown)}
        onClose={() => setOpen((o) => o && { ...o, shown: false })}
        title={shown ? dayName(shown.day) : ""}
        index={Math.max(index, 0)}
        total={active.length}
        onMove={(to) => onOpen(active[to].day, null)}
      >
        {shown && <PlanningDaySheet day={shown} focus={open?.move ?? null} />}
      </FinanceSheet>
    </>
  );
}

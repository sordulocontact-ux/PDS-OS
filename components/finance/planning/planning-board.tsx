"use client";

import { IconChevronLeft } from "nucleo-sharp-essential";
import { useState } from "react";

import { SideSheet } from "@/components/ui/side-sheet";
import {
  MoveRecord,
  type MoveRecordData,
} from "@/components/finance/move-record";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import type { PlanningDay, PlanningMove } from "@/lib/finance/planning";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";

import { PlanningDaySheet } from "./planning-day-sheet";
import { dayName } from "./planning-format";
import { PlanningGrid } from "./planning-grid";
import { PlanningList } from "./planning-list";

const t = financePlanning;

/**
 * Finance › Planning's month: the grid from `lg`, a list of the days with
 * moves below (a phone, no sideways scroll). A day opens in Finance's side
 * sheet; ↑ ↓ go to the day with moves before or after. A move of the day
 * opens its own record in the same panel (its spend, its income), with a
 * way back to the day: the Planning is never left.
 */
export function PlanningBoard({
  monthName,
  cells,
  days,
  today,
  data,
}: {
  // « novembre 2026 », for the screen readers' names.
  monthName: string;
  cells: string[];
  days: PlanningDay[];
  today: string;
  // What the moves' records are read from.
  data: MoveRecordData;
}) {
  const active = days.filter((d) => d.moves.length > 0);
  // The day stays drawn while the sheet closes.
  const [open, setOpen] = useState<{
    day: string;
    move: string | null;
    shown: boolean;
  } | null>(null);
  // The move whose record the panel shows instead of the day.
  const [record, setRecord] = useState<PlanningMove | null>(null);
  const index = open ? active.findIndex((d) => d.day === open.day) : -1;
  const shown = index >= 0 ? active[index] : null;
  const onOpen = (day: string, move: string | null) => {
    setRecord(null);
    setOpen({ day, move, shown: true });
  };

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
      <SideSheet
        open={shown !== null && Boolean(open?.shown)}
        onClose={() => setOpen((o) => o && { ...o, shown: false })}
        title={record ? record.label : shown ? dayName(shown.day) : ""}
        index={record ? 0 : Math.max(index, 0)}
        total={record ? 1 : active.length}
        onMove={(to) => onOpen(active[to].day, null)}
      >
        {shown &&
          (record ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="-mt-2 -ml-2 self-start"
                onClick={() => setRecord(null)}
              >
                <IconChevronLeft aria-hidden data-icon="inline-start" />
                {t.record.back}
              </Button>
              <MoveRecord
                move={{
                  target: record.target,
                  label: record.label,
                  direction: record.direction,
                  cents: record.cents,
                  eyebrow: t.origins[record.origin],
                }}
                data={data}
              />
            </>
          ) : (
            <PlanningDaySheet
              day={shown}
              focus={open?.move ?? null}
              onOpenMove={setRecord}
            />
          ))}
      </SideSheet>
    </>
  );
}

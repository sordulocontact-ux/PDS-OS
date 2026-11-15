import type { PlanningDay } from "@/lib/finance/planning";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";
import { cn } from "@/lib/utils";

import { amount, shownBalance } from "./planning-format";
import { PlanningMarks, PlanningPill } from "./planning-pill";

const t = financePlanning;

// Moves drawn in a day before « +N », which opens the day.
const SHOWN = 3;

/** The day's number, in an ink circle on today. */
export function PlanningDayNumber({
  day,
  today,
  muted = false,
}: {
  day: string;
  today: string;
  muted?: boolean;
}) {
  return (
    <span
      aria-current={day === today ? "date" : undefined}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-circle)] text-micro font-medium tabular-nums",
        muted && "text-[color:var(--text-tertiary)]",
        day === today && "bg-foreground text-background",
      )}
    >
      {Number(day.slice(8))}
    </span>
  );
}

/** The balance at the end of a day, small and grey; amber under the reserve. */
export function PlanningBalance({
  day,
  className,
}: {
  day: PlanningDay;
  className?: string;
}) {
  const balance = shownBalance(day);
  if (balance === null) return null;
  return (
    <span
      className={cn(
        "text-micro whitespace-nowrap tabular-nums",
        day.belowReserve
          ? "text-[color:var(--tone-warning-fg)]"
          : "text-[color:var(--text-tertiary)]",
        className,
      )}
    >
      {amount(balance)}
    </span>
  );
}

/**
 * A day of the month in the grid: its number and marks, three moves then
 * « +N », the balance at the bottom when it moves. Not interactive itself:
 * the grid's cell opens the day.
 */
export function PlanningCell({
  day,
  today,
}: {
  day: PlanningDay;
  today: string;
}) {
  const rest = day.moves.length - SHOWN;
  return (
    <div className="@container/cell flex h-full min-h-32 flex-col gap-1 p-1.5">
      <PlanningDayNumber day={day.day} today={today} />
      <PlanningMarks day={day} />
      {day.moves.slice(0, SHOWN).map((m) => (
        <PlanningPill key={m.key} move={m} />
      ))}
      {rest > 0 && (
        <span className="self-start px-1 text-micro font-medium text-[color:var(--text-secondary)]">
          {t.more(rest)}
        </span>
      )}
      <PlanningBalance day={day} className="mt-auto self-end" />
    </div>
  );
}

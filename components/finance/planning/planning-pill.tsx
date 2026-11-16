import { SignedAmount } from "@/components/finance/signed-amount";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusDot } from "@/components/ui/status-dot";
import type { PlanningDay, PlanningMove } from "@/lib/finance/planning";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";
import { planningMarkTone, incomeStateTone } from "@/lib/ui/state-tones";

const t = financePlanning;

/**
 * One move in a day of the Planning: its name over its signed amount (in
 * green when it comes in). The name takes two lines at most; in a cell too
 * narrow for it (`@container/cell`, the grid's cell) only the amount stays,
 * the name in the tooltip (the cell's label says it to screen readers). A late one, counted
 * today, has a dot of the « late » tone. `data-move` lets a click open the
 * day on it.
 */
export function PlanningPill({ move }: { move: PlanningMove }) {
  return (
    <span
      data-move={move.key}
      title={move.label}
      className="flex min-w-0 flex-col gap-0.5 rounded-sm bg-[var(--surface-soft)] px-1.5 py-1 text-micro [@media(hover:hover)]:hover:bg-[var(--control-bg-hover)]"
    >
      <span className="hidden @[7.5rem]/cell:line-clamp-2 @[7.5rem]/cell:break-words @[7.5rem]/cell:text-[color:var(--text-secondary)]">
        {move.label}
      </span>
      <span className="flex items-center justify-end gap-1">
        {move.dueOn && <StatusDot tone={incomeStateTone.late} label={t.late} />}
        <SignedAmount event={move} size="sm" />
      </span>
    </span>
  );
}

/** The marks of a day: under the reserve, the forecast's low point. */
export function PlanningMarks({ day }: { day: PlanningDay }) {
  if (day.marks.length === 0) return null;
  return (
    <span className="flex min-w-0 flex-wrap gap-1">
      {day.marks.map((m) => (
        <StatusBadge
          key={m}
          tone={planningMarkTone[m]}
          size="sm"
          className="max-w-full overflow-hidden"
        >
          {t.marks[m]}
        </StatusBadge>
      ))}
    </span>
  );
}

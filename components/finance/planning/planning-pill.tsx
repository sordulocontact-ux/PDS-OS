import { SignedAmount } from "@/components/finance/signed-amount";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatusDot } from "@/components/ui/status-dot";
import type { PlanningDay, PlanningMove } from "@/lib/finance/planning";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";
import { planningMarkTone, incomeStateTone } from "@/lib/ui/state-tones";

const t = financePlanning;

/**
 * One move in a day of the Planning: its name cut to the cell, its signed
 * amount (in green when it comes in). A late one, counted today, starts with
 * a dot of the « late » tone. `data-move` lets a click open the day on it.
 */
export function PlanningPill({ move }: { move: PlanningMove }) {
  return (
    <span
      data-move={move.key}
      className="flex min-w-0 items-center gap-1 rounded-sm bg-[var(--surface-soft)] px-1.5 py-0.5 text-micro [@media(hover:hover)]:hover:bg-[var(--control-bg-hover)]"
    >
      {move.dueOn && <StatusDot tone={incomeStateTone.late} label={t.late} />}
      <span className="min-w-0 flex-1 truncate text-[color:var(--text-secondary)]">
        {move.label}
      </span>
      <SignedAmount event={move} size="sm" />
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

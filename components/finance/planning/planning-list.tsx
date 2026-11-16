import { SignedAmount } from "@/components/finance/signed-amount";
import { StatusDot } from "@/components/ui/status-dot";
import type { PlanningDay } from "@/lib/finance/planning";
import { financePlanning } from "@/lib/i18n/fr/finance-planning";
import { incomeStateTone } from "@/lib/ui/state-tones";

import { PlanningBalance, PlanningDayNumber } from "./planning-cell";
import { dayLabel, dayName } from "./planning-format";
import { PlanningMarks } from "./planning-pill";

const t = financePlanning;

/**
 * The month on a phone (no grid wider than the screen): only the days with
 * moves, one under the other, each with all its moves and its balance. A
 * day opens like a day of the grid.
 */
export function PlanningList({
  label,
  days,
  today,
  onOpen,
}: {
  label: string;
  days: PlanningDay[];
  today: string;
  onOpen: (day: string, move: string | null) => void;
}) {
  return (
    <ol
      aria-label={label}
      className="flex flex-col overflow-hidden rounded-lg border border-[color:var(--border-hairline)] bg-card"
    >
      {days.map((d) => (
        <li
          key={d.day}
          className="border-b border-[color:var(--border-hairline)] last:border-b-0"
        >
          <button
            type="button"
            aria-label={dayLabel(d)}
            aria-haspopup="dialog"
            onClick={() => onOpen(d.day, null)}
            className="flex w-full flex-col gap-2 px-3 py-3 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--focus-ring)] [@media(hover:hover)]:hover:bg-[var(--control-bg-hover)]"
          >
            <span className="flex items-center gap-2">
              <PlanningDayNumber day={d.day} today={today} />
              <span className="min-w-0 flex-1 truncate text-caption text-[color:var(--text-secondary)]">
                {dayName(d.day)}
              </span>
              <PlanningBalance day={d} />
            </span>
            <PlanningMarks day={d} />
            <span className="flex flex-col gap-1">
              {d.moves.map((m) => (
                <span key={m.key} className="flex items-center gap-2">
                  {m.dueOn && (
                    <StatusDot tone={incomeStateTone.late} label={t.late} />
                  )}
                  <span className="min-w-0 flex-1 truncate">{m.label}</span>
                  <SignedAmount event={m} size="sm" />
                </span>
              ))}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

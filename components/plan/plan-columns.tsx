import type { ReactNode } from "react";

import { StateMark, type MarkState } from "@/components/ui/state-mark";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { PLAN_COLUMNS, type PlanColumn } from "@/lib/plan/propose";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/utils/day";

const fr = { framingIntel };

// The mark of each group on the plan's line: what starts now, what follows,
// what runs beside, what to plan for (dashed: nothing runs yet).
const MARK: Record<PlanColumn, MarkState> = {
  focus: "current",
  next: "idle",
  meanwhile: "idle",
  anticipate: "todo",
};

/**
 * The plan as one line from now to the target date (Akili, 05/11/2026: « un
 * vrai plan visuel avec hiérarchisation »): each group a stop on the line —
 * « Focus · Ce qui commence maintenant », Ensuite, Pendant ce temps, À
 * anticiper —, its steps as cards beside it, two per row when there is
 * room; the target date closes the line. An empty group is not shown. The
 * cards come from the caller: the proposal being edited (PlanBoard) or the
 * launched plan.
 */
export function PlanColumns({
  cards,
  targetDate,
}: {
  cards: Record<PlanColumn, ReactNode[]>;
  // The Cadrage's target date, at the end of the line.
  targetDate?: string | null;
}) {
  const t = fr.framingIntel.plan;
  const groups = PLAN_COLUMNS.filter((column) => cards[column].length > 0);
  const stop = (
    mark: ReactNode,
    last: boolean,
    content: ReactNode,
    key: string,
  ) => (
    <li key={key} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3">
      <div className="flex flex-col items-center">
        <span className="flex h-6 items-center">{mark}</span>
        {!last && (
          <span
            aria-hidden
            className="w-px flex-1 bg-[color:var(--border-default)]"
          />
        )}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-2.5 modern:gap-2",
          !last && "pb-6",
        )}
      >
        {content}
      </div>
    </li>
  );
  return (
    <ol className="@container flex flex-col">
      {groups.map((column, index) =>
        stop(
          <StateMark state={MARK[column]} size="sm" />,
          index === groups.length - 1 && !targetDate,
          <section
            aria-labelledby={`plan-${column}`}
            className="flex min-w-0 flex-col gap-2.5 modern:gap-2"
          >
            <h4
              id={`plan-${column}`}
              className="flex min-h-6 flex-wrap items-baseline gap-x-2"
            >
              <span className="font-semibold">{t.columns[column]}</span>
              <span className="text-caption text-[color:var(--text-secondary)]">
                {t.columnHints[column]}
              </span>
            </h4>
            <ul
              className={cn(
                "grid gap-2.5 modern:gap-2",
                column !== "anticipate" && "@xl:grid-cols-2",
              )}
            >
              {cards[column]}
            </ul>
          </section>,
          column,
        ),
      )}
      {targetDate &&
        stop(
          <span
            aria-hidden
            className="size-3 rotate-45 rounded-[2px] bg-[color:var(--text-primary)]"
          />,
          true,
          <p className="flex min-h-6 flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{t.target}</span>
            <span className="text-caption text-[color:var(--text-secondary)]">
              {formatDay(targetDate)}
            </span>
          </p>,
          "target",
        )}
    </ol>
  );
}

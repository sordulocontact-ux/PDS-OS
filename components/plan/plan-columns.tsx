import type { ReactNode } from "react";

import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { PLAN_COLUMNS, type PlanColumn } from "@/lib/plan/propose";

const fr = { framingIntel };

/**
 * The plan's four columns (proto frPlanView `.plan4`): Focus « Ce qui
 * commence maintenant », Ensuite, Pendant ce temps, À anticiper, two by two
 * from a tablet on, « — » when a column is empty. The cards come from the
 * caller: the proposal being edited (PlanBoard) or the launched plan.
 */
export function PlanColumns({
  cards,
}: {
  cards: Record<PlanColumn, ReactNode[]>;
}) {
  const t = fr.framingIntel.plan;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {PLAN_COLUMNS.map((column) => (
        <section
          key={column}
          aria-labelledby={`plan-${column}`}
          className="flex min-w-0 flex-col gap-2.5 rounded-2xl bg-[var(--surface-tint)] p-3"
        >
          <header className="flex flex-col gap-1">
            <h3 id={`plan-${column}`} className="text-body-md font-semibold">
              {t.columns[column]}
            </h3>
            <p className="text-caption text-[color:var(--text-secondary)]">
              {t.columnHints[column]}
            </p>
          </header>
          {cards[column].length === 0 ? (
            <p className="text-caption text-[color:var(--text-secondary)]">—</p>
          ) : (
            <ul className="flex flex-col gap-2">{cards[column]}</ul>
          )}
        </section>
      ))}
    </div>
  );
}

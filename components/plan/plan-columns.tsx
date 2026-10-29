import type { ReactNode } from "react";

import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { PLAN_COLUMNS, type PlanColumn } from "@/lib/plan/propose";

const fr = { framingIntel };

/**
 * The plan's four groups, one under the other (proto « Suite du Cadrage »,
 * Sacha 29/10/2026): « Focus · Ce qui commence maintenant », Ensuite,
 * Pendant ce temps, À anticiper, a rule between them; an empty group is
 * not shown. The rows come from the caller: the proposal being edited
 * (PlanBoard) or the launched plan.
 */
export function PlanColumns({
  cards,
}: {
  cards: Record<PlanColumn, ReactNode[]>;
}) {
  const t = fr.framingIntel.plan;
  return (
    <div className="flex flex-col">
      {PLAN_COLUMNS.filter((column) => cards[column].length > 0).map(
        (column) => (
          <section
            key={column}
            aria-labelledby={`plan-${column}`}
            className="flex min-w-0 flex-col border-t border-[color:var(--border-hairline)] pt-3.5 first:border-t-0 first:pt-0 [&:not(:last-child)]:pb-2"
          >
            <h4
              id={`plan-${column}`}
              className="flex flex-wrap items-baseline gap-x-2"
            >
              <span className="font-semibold">{t.columns[column]}</span>
              <span className="text-caption text-[color:var(--text-secondary)]">
                {t.columnHints[column]}
              </span>
            </h4>
            <ul className="flex flex-col">{cards[column]}</ul>
          </section>
        ),
      )}
    </div>
  );
}

import { DashboardFilterBar } from "@/components/marketing/review/dashboard-filters";
import { Fold } from "@/components/ui/fold";
import { fr } from "@/lib/i18n/fr";
import type { DashboardFilters } from "@/lib/marketing/dashboard";
import type { BudgetBreakdown } from "@/lib/marketing/review/budget-breakdown";
import type { ObjectiveRow } from "@/lib/marketing/review/objectives";
import type { Standing } from "@/lib/marketing/review/standing";

import { StandingRows, StandingTiles } from "./standing-figures";
import { StandingGoals } from "./standing-goals";

const t = fr.reviewJourney.standing;

/**
 * « Où on en est » above the journey of the Suivi & bilan (proto
 * `dashboard`): four sentences that open their list and rule, then the
 * whole detail folded under « Voir le détail », with its filters (ticket
 * « Suivi & bilan », écran 1). Calculated at each opening, never stored.
 */
export function StandingCard({
  standing,
  goals,
  budget,
  filters,
  filtered,
  action,
  owners,
  sources,
}: {
  standing: Standing;
  // Objectives against results, budget by activation (MKT-BIL-002).
  goals: ObjectiveRow[];
  budget: BudgetBreakdown | null;
  filters: DashboardFilters;
  filtered: boolean;
  // The page the filters reload.
  action: string;
  owners: { personId: string; name: string }[];
  sources: string[];
}) {
  return (
    <section
      aria-labelledby="review-standing"
      className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2
          id="review-standing"
          className="text-[length:var(--type-body-xl)] leading-[var(--type-body-xl-lh)] font-medium"
        >
          {t.title}
        </h2>
        {!standing.empty && (
          <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
            {t.computed}
          </span>
        )}
      </div>
      {standing.empty ? (
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {t.empty}
        </p>
      ) : (
        <>
          <StandingRows rows={standing.rows} />
          <Fold summary={t.detail} defaultOpen={filtered}>
            <DashboardFilterBar
              action={action}
              filters={filters}
              owners={owners}
              sources={sources}
            />
            <StandingTiles groups={standing.groups} />
            <StandingGoals goals={goals} budget={budget} />
          </Fold>
        </>
      )}
    </section>
  );
}

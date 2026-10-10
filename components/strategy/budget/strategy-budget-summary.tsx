import { StatTiles } from "@/components/ui/stat-tiles";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import type { StrategyBudget } from "@/lib/strategy/budget";

/**
 * The strategy's reading of the budget: the envelope, what is proposed,
 * validated and still to arbitrate, and what remains. Amounts summed by
 * code (lib/strategy/budget.ts); an overrun is said in words.
 */
export function StrategyBudgetSummary({ budget }: { budget: StrategyBudget }) {
  const t = fr.strategyBudget;
  const remaining = budget.remainingCents;
  return (
    <div className="flex flex-col gap-3">
      <StatTiles
        columns={5}
        stats={[
          {
            label: t.tiles.envelope,
            value:
              budget.envelopeCents === null
                ? t.noEnvelope
                : formatEuros(budget.envelopeCents),
          },
          { label: t.tiles.proposed, value: formatEuros(budget.proposedCents) },
          {
            label: t.tiles.validated,
            value: formatEuros(budget.validatedCents),
          },
          { label: t.tiles.toDecide, value: formatEuros(budget.toDecideCents) },
          {
            label: t.tiles.remaining,
            value: remaining === null ? t.noRemaining : formatEuros(remaining),
          },
        ]}
      />
      {remaining !== null && remaining < 0 && (
        <StatusBadge tone="danger" className="self-start">
          {t.overrun(formatEuros(-remaining))}
        </StatusBadge>
      )}
      <p className="text-caption text-muted-foreground">
        {t.meaning} {t.internal}
      </p>
    </div>
  );
}

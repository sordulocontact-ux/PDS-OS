import { StatTiles } from "@/components/ui/stat-tiles";
import { InfoRow, Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import type { BudgetView } from "@/lib/strategy/dimension-budget";
import { strategyBudgetLineTone } from "@/lib/ui/state-tones";

const t = fr.strategyDimensions.budget;
const euros = (cents: number) => t.amount(formatEuros(cents));

/**
 * « Budget stratégie » (proto dimBody « bud »): Enveloppe, Proposé, Validé,
 * À arbitrer, Reste, each with what it counts; then each line with its
 * lever, its amount and its state, which follows its lever. Internal.
 */
export function BudgetBlock({ budget }: { budget: BudgetView }) {
  const b = budget;
  return (
    <>
      <StatTiles
        columns={5}
        stats={[
          {
            label: t.envelope,
            value:
              b.envelopeCents === null ? t.noEnvelope : euros(b.envelopeCents),
            hint: t.envelopeSource,
          },
          {
            label: t.proposed,
            value: euros(b.proposedCents),
            hint: t.proposedSource,
          },
          {
            label: t.validated,
            value: euros(b.validatedCents),
            hint: t.validatedSource,
          },
          {
            label: t.toDecide,
            value: euros(b.toDecideCents),
            hint: t.toDecideSource,
          },
          {
            label: t.rest,
            value: b.restCents === null ? "—" : euros(b.restCents),
            hint: t.restSource,
          },
        ]}
      />
      {b.lines.length > 0 && (
        <Rows label={fr.strategyDimensions.names.budget}>
          {b.lines.map((l) => (
            <InfoRow
              key={l.id}
              title={l.label}
              detail={l.leverLabel ? t.leverOf(l.leverLabel) : t.outOfLever}
              badge={
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold tabular-nums">
                    {euros(l.amountCents)}
                  </span>
                  <StatusBadge tone={strategyBudgetLineTone[l.state]} size="sm">
                    {l.state === "to_decide"
                      ? t.lineToDecide
                      : l.state === "dropped"
                        ? t.lineDropped
                        : fr.budget.statuses[l.status]}
                  </StatusBadge>
                </span>
              }
            />
          ))}
        </Rows>
      )}
      <p className="text-caption text-muted-foreground">{t.internal}</p>
    </>
  );
}

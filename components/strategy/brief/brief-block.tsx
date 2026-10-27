import { StatusBadge } from "@/components/ui/status-badge";
import { strategyBrief } from "@/lib/i18n/fr/strategy-brief";
import { strategyPilot } from "@/lib/i18n/fr/strategy-pilot";
import type { StrategyDimension } from "@/lib/strategy/dimensions";
import { strategyDimensionTone } from "@/lib/ui/state-tones";

const fr = { strategyBrief, strategyPilot };

/**
 * One dimension of the Brief de sortie: its number and name, then its
 * content. Only a dimension with something left to arbitrate is flagged.
 */
export function BriefBlock({
  dimension,
  index,
  toDecide,
  children,
}: {
  dimension: StrategyDimension;
  index: number;
  toDecide: boolean;
  children: React.ReactNode;
}) {
  const t = fr.strategyPilot;
  const id = `brief-${dimension}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-body-md font-medium text-muted-foreground tabular-nums">
          {t.number(index)}
        </span>
        <h2 id={id} className="text-body-lg font-semibold">
          {t.dimensions[dimension]}
        </h2>
        {toDecide && (
          <StatusBadge tone={strategyDimensionTone.to_decide} size="sm">
            {fr.strategyBrief.toDecide.badge}
          </StatusBadge>
        )}
      </div>
      <div className="flex flex-col gap-2 text-body-md">{children}</div>
    </section>
  );
}

/** A blank answer, said in grey. */
export function BriefEmpty({ children }: { children?: React.ReactNode }) {
  return (
    <p className="text-muted-foreground">
      {children ?? fr.strategyBrief.sections.empty}
    </p>
  );
}

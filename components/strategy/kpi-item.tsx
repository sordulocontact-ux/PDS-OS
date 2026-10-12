"use client";

import { optionClass } from "@/components/ui/option-class";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import {
  isKpiKind,
  isKpiMetric,
  kpiTracking,
  type KpiActual,
} from "@/lib/strategy/kpis";
import type { StrategyObjective } from "@/lib/strategy/queries";

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const dueFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** What the code knows of the real value: nothing is ever made up. */
function actualLine(actual: KpiActual | undefined): string | null {
  const t = fr.strategyKpis;
  if (!actual) return null;
  if (actual.status === "measured")
    return t.measured(number.format(actual.value));
  return actual.status === "pending" ? t.pending : t.unavailable;
}

/**
 * One KPI: its signal, its kind, its target or « sans chiffre », its
 * deadline, and for a measured one the real value read by code.
 */
export function KpiItem({
  kpi,
  ownerName,
  actual,
  canEdit,
  pending,
  onEdit,
  onRemove,
}: {
  kpi: StrategyObjective;
  // Who follows it (MKT-S1-13), read by the caller from the members.
  ownerName: string | null;
  actual: KpiActual | undefined;
  canEdit: boolean;
  pending: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = fr.strategyKpis;
  const kind = isKpiKind(kpi.kind) ? kpi.kind : "quantitative";
  const figure =
    kind === "qualitative"
      ? t.noFigure
      : kpi.target === null
        ? t.noTarget
        : t.targetLine(
            [number.format(kpi.target), kpi.unit].filter(Boolean).join(" "),
          );
  const measured = actualLine(actual);
  const metric = isKpiMetric(kpi.metric) ? kpi.metric : null;

  return (
    <li className={`${optionClass(false)} justify-between`}>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold break-words">{kpi.label}</span>
          <StatusBadge tone="neutral" size="sm">
            {t.kinds[kind]}
          </StatusBadge>
        </div>
        <span className="text-caption text-muted-foreground tabular-nums">
          {[
            figure,
            kpi.due_on
              ? dueFormat.format(new Date(`${kpi.due_on}T00:00:00Z`))
              : t.noDueOn,
          ].join(" · ")}
        </span>
        {kind === "quantitative" && (
          <span className="text-caption text-muted-foreground">
            {[
              metric ? t.metrics[metric] : null,
              t.tracking[kpiTracking(metric, kpi.source)],
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
        {kind === "quantitative" && (
          <span className="text-caption text-muted-foreground">
            {[
              t.definitions[metric ?? "other"].definition,
              t.definitions[metric ?? "other"].formula,
              t.sources[kpiTracking(metric, kpi.source)],
              t.period(
                kpi.due_on
                  ? dueFormat.format(new Date(`${kpi.due_on}T00:00:00Z`))
                  : null,
              ),
            ].join(" ")}
          </span>
        )}
        {ownerName && (
          <span className="text-caption text-muted-foreground">
            {t.ownerLine(ownerName)}
          </span>
        )}
        {measured && (
          <span className="text-caption text-foreground tabular-nums">
            {measured}
          </span>
        )}
      </div>
      {canEdit && (
        <div className="flex shrink-0 gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            aria-label={t.editLabel(kpi.label)}
            onClick={onEdit}
          >
            {t.edit}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            aria-label={t.removeLabel(kpi.label)}
            onClick={onRemove}
          >
            {t.remove}
          </Button>
        </div>
      )}
    </li>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { strategyKpis } from "@/lib/i18n/fr/strategy-kpis";
import {
  isKpiKind,
  isKpiMetric,
  kpiTracking,
  type KpiActual,
} from "@/lib/strategy/kpis";
import type { StrategyObjective } from "@/lib/strategy/queries";

const fr = { strategyKpis };

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
    // A row of the KPIs' `Rows` (its frame and hairlines).
    <li className="flex flex-wrap items-start justify-between gap-3 px-3.5 py-3">
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
        // « Modifier » outlined, « Retirer » in text beside it.
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
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

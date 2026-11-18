"use client";

import { FlowBars } from "@/components/finance/flow-bars";
import { TreasuryChart } from "@/components/finance/treasury-chart";
import { DonutChart } from "@/components/ui/donut-chart";
import { MetricCard } from "@/components/ui/metric-card";
import { RankedBars } from "@/components/ui/ranked-bars";
import type { ChartDisplay } from "@/lib/assistant/display";
import { assistantShow } from "@/lib/i18n/fr/assistant-show";
import { formatAmount } from "@/lib/utils/money";

const fr = { assistantShow };

/**
 * A chart PO asked for (show_chart), drawn by the same components as the
 * pages it comes from (Finance's curve, bars and pie, the ranked bars):
 * every figure was computed by code, never by the model. In a metric card,
 * as on Finance's pages; « Entrées et sorties » brings its own.
 */
export function AnswerChart({ chart }: { chart: ChartDisplay }) {
  const t = fr.assistantShow.charts;
  switch (chart.kind) {
    case "flows":
      return <FlowBars flows={chart.flows} />;
    case "treasury":
      return (
        <MetricCard title={chart.title}>
          <TreasuryChart
            points={chart.points}
            reserveCents={chart.reserveCents}
            low={chart.low}
          />
        </MetricCard>
      );
    case "donut":
      return (
        <MetricCard title={chart.title}>
          <DonutChart
            slices={chart.slices}
            empty={chart.empty}
            totalLabel={chart.totalLabel}
          />
        </MetricCard>
      );
    case "bars":
      return (
        <MetricCard title={chart.title}>
          <RankedBars
            items={chart.items}
            label={chart.title}
            limit={8}
            empty={chart.empty}
            share={t.share}
            others={(count, value) => ({
              label: t.others(count),
              display: valueOf(chart.unit, value),
            })}
          />
        </MetricCard>
      );
  }
}

// A value of the bars as they say it: an amount, or a share of 100 %.
function valueOf(unit: "money" | "percent", value: number): string {
  return unit === "money"
    ? formatAmount(value, { ht: false })
    : `${(value / 100).toLocaleString("fr-FR")} %`;
}

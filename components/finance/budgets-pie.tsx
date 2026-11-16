import { DonutChart } from "@/components/ui/donut-chart";
import { MetricCard } from "@/components/ui/metric-card";
import type { EnvelopeRow } from "@/lib/finance/envelopes";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { postShade, rampShade } from "@/lib/ui/category-hues";

const fr = { financeBudgets };

// The four largest budgets, then the rest in one slice.
const SHOWN = 4;

/**
 * « Un graphique en camembert pour les budgets, histoire d'avoir une vue
 * un peu plus globale » (Ibé, 16/11/2026): how the amount of the budgets
 * shown (Finance › Budgets, by its type filter) splits between them, the
 * four largest and the rest, darkest first on the chart's one-ink ramp.
 */
export function BudgetsPie({ rows }: { rows: EnvelopeRow[] }) {
  const t = fr.financeBudgets.split;
  const sized = rows
    .filter((r) => (r.currentCents ?? 0) > 0)
    .sort((a, b) => (b.currentCents ?? 0) - (a.currentCents ?? 0));
  const restCents = sized
    .slice(SHOWN)
    .reduce((s, r) => s + (r.currentCents ?? 0), 0);
  return (
    <MetricCard title={t.title} caption={t.caption}>
      <DonutChart
        empty={t.empty}
        totalLabel={t.total}
        slices={[
          ...sized.slice(0, SHOWN).map((r, i) => ({
            key: r.id,
            label: r.name,
            cents: r.currentCents ?? 0,
            shade: rampShade(i),
          })),
          {
            key: "rest",
            label: t.rest,
            cents: restCents,
            shade: postShade(null),
          },
        ]}
      />
    </MetricCard>
  );
}

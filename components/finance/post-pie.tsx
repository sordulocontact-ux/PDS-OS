import { DonutChart } from "@/components/ui/donut-chart";
import { MetricCard } from "@/components/ui/metric-card";
import type { PostRow } from "@/lib/finance/envelopes";
import { budget } from "@/lib/i18n/fr/budget";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { distinctShades, postShade } from "@/lib/ui/category-hues";

const fr = { budget, financeBudgets };

// The four largest postes, then the rest in one slice.
const SHOWN = 4;

/**
 * « Le camembert montre la répartition par poste » (Ibé's ticket): what the
 * lines cost now by poste, the four largest and the rest, each poste in its
 * own shade (`postShade`, the same as its square in the spends' table).
 */
export function PostPie({
  posts,
  action,
}: {
  posts: PostRow[];
  // In the card's header: the budget the split is of (Trésorerie).
  action?: React.ReactNode;
}) {
  const t = fr.financeBudgets.pie;
  const restCents = posts
    .slice(SHOWN)
    .reduce((s, p) => s + p.totals.projectedCents, 0);
  const raw = [
    ...posts.slice(0, SHOWN).map((p) => ({
      key: p.family ?? "none",
      label: p.family ? fr.budget.families[p.family] : t.none,
      cents: p.totals.projectedCents,
      shade: postShade(p.family),
    })),
    {
      key: "rest",
      label: t.rest,
      cents: restCents,
      shade: postShade(null),
    },
  ];
  const shades = distinctShades(raw.map((x) => x.shade));
  return (
    <MetricCard title={t.title} caption={t.caption} action={action}>
      <DonutChart
        empty={t.empty}
        totalLabel={t.total}
        slices={raw.map((x, i) => ({ ...x, shade: shades[i] }))}
      />
    </MetricCard>
  );
}

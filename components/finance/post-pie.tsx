import { DonutChart } from "@/components/ui/donut-chart";
import { MetricCard } from "@/components/ui/metric-card";
import type { PostRow } from "@/lib/finance/envelopes";
import { postSlices } from "@/lib/finance/post-slices";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";

const fr = { financeBudgets };

/**
 * « Le camembert montre la répartition par poste » (Ibé's ticket): the
 * slices of lib/finance/post-slices.ts (also drawn by PO, show_chart).
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
  return (
    <MetricCard title={t.title} caption={t.caption} action={action}>
      <DonutChart
        empty={t.empty}
        totalLabel={t.total}
        slices={postSlices(posts)}
      />
    </MetricCard>
  );
}

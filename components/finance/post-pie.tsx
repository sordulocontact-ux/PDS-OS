import { MetricCard } from "@/components/ui/metric-card";
import type { PostRow } from "@/lib/finance/envelopes";
import { budget } from "@/lib/i18n/fr/budget";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { formatAmount } from "@/lib/utils/money";

const fr = { budget, financeBudgets };

const amount = (cents: number) => formatAmount(cents, { ht: false });

// The chart ramp (tokens --chart-*), darkest first: four postes and the rest.
const SHADES = [
  { stroke: "stroke-chart-5", fill: "bg-chart-5" },
  { stroke: "stroke-chart-4", fill: "bg-chart-4" },
  { stroke: "stroke-chart-3", fill: "bg-chart-3" },
  { stroke: "stroke-chart-2", fill: "bg-chart-2" },
  { stroke: "stroke-chart-1", fill: "bg-chart-1" },
];
const SHOWN = SHADES.length - 1;
// A circle of perimeter 100: each slice's length is its percent.
const R = 15.915;

/**
 * « Le camembert montre la répartition par poste » (Ibé's ticket): what the
 * lines cost now by poste, the four largest and the rest, in the chart's
 * one-ink ramp, each named with its amount and share in the legend (the
 * figures never ride on colour alone).
 */
export function PostPie({ posts }: { posts: PostRow[] }) {
  const t = fr.financeBudgets.pie;
  const total = posts.reduce((s, p) => s + p.totals.projectedCents, 0);
  const named = posts.slice(0, SHOWN).map((p) => ({
    key: p.family ?? "none",
    label: p.family ? fr.budget.families[p.family] : t.none,
    cents: p.totals.projectedCents,
  }));
  const restCents = posts
    .slice(SHOWN)
    .reduce((s, p) => s + p.totals.projectedCents, 0);
  const slices = [
    ...named,
    ...(restCents > 0
      ? [{ key: "rest", label: t.rest, cents: restCents }]
      : []),
  ].filter((s) => s.cents > 0);
  let offset = 25;

  return (
    <MetricCard title={t.title} caption={t.caption}>
      {total === 0 ? (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.empty}
        </p>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <svg
            viewBox="0 0 42 42"
            className="size-36 shrink-0 -rotate-90"
            aria-hidden
          >
            {slices.map((s, i) => {
              const length = (s.cents / total) * 100;
              const circle = (
                <circle
                  key={s.key}
                  cx="21"
                  cy="21"
                  r={R}
                  fill="none"
                  className={SHADES[i].stroke}
                  strokeWidth="6"
                  strokeDasharray={`${length} ${100 - length}`}
                  strokeDashoffset={offset}
                />
              );
              offset -= length;
              return circle;
            })}
          </svg>
          <ul className="grid w-full min-w-0 gap-2">
            {slices.map((s, i) => (
              <li
                key={s.key}
                className="flex items-center justify-between gap-3 text-body-md"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className={`size-2.5 shrink-0 rounded-full ${SHADES[i].fill}`}
                  />
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="shrink-0 text-[color:var(--text-secondary)] tabular-nums">
                  {amount(s.cents)} · {Math.round((s.cents / total) * 100)} %
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </MetricCard>
  );
}

import { MetricCard } from "@/components/ui/metric-card";
import type { PostRow } from "@/lib/finance/envelopes";
import { budget } from "@/lib/i18n/fr/budget";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { formatAmount } from "@/lib/utils/money";
import { PostLabel } from "@/components/finance/post-label";
import { postShade } from "@/lib/ui/category-hues";

const fr = { budget, financeBudgets };

const amount = (cents: number) => formatAmount(cents, { ht: false });

// The four largest postes, then the rest in one slice.
const SHOWN = 4;
// A circle of perimeter 100: each slice's length is its percent.
const R = 15.915;

/**
 * « Le camembert montre la répartition par poste » (Ibé's ticket): what the
 * lines cost now by poste, the four largest and the rest, each poste in its
 * own shade (`postShade`, the same as its square in the spends' table),
 * named with its amount and share in the legend (the figures never ride on
 * colour alone).
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
  const total = posts.reduce((s, p) => s + p.totals.projectedCents, 0);
  const named = posts.slice(0, SHOWN).map((p) => ({
    key: p.family ?? "none",
    family: p.family,
    label: p.family ? fr.budget.families[p.family] : t.none,
    cents: p.totals.projectedCents,
  }));
  const restCents = posts
    .slice(SHOWN)
    .reduce((s, p) => s + p.totals.projectedCents, 0);
  const slices = [
    ...named,
    ...(restCents > 0
      ? [{ key: "rest", family: null, label: t.rest, cents: restCents }]
      : []),
  ].filter((s) => s.cents > 0);
  let offset = 25;

  return (
    <MetricCard title={t.title} caption={t.caption} action={action}>
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
            {slices.map((s) => {
              const length = (s.cents / total) * 100;
              const circle = (
                <circle
                  key={s.key}
                  cx="21"
                  cy="21"
                  r={R}
                  fill="none"
                  className={postShade(s.family).stroke}
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
            {slices.map((s) => (
              <li
                key={s.key}
                className="flex items-center justify-between gap-3 text-body-md"
              >
                <PostLabel family={s.family} label={s.label} />
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

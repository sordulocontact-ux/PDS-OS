import { MetricCard, MetricCardLink } from "@/components/ui/metric-card";
import { RestAmount } from "@/components/ui/rest-amount";
import { ProgressBar } from "@/components/ui/progress-bar";
import { routes } from "@/lib/auth/redirects";
import type { BudgetRow } from "@/lib/finance/aggregate";
import { treasury as treasuryText } from "@/lib/i18n/fr/treasury";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/utils/money";

const fr = { treasury: treasuryText };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * « Disponible sur les budgets » (the overview and Trésorerie): what the
 * live budgets still allow, then the nearest to their limit, each with
 * what is left of it (« Reste … », « Dépassé de … ») and its bar (spent on
 * the budget, red past it).
 */
export function BudgetsCard({
  availableCents,
  activeEnvelopes,
  budgets,
  names,
}: {
  availableCents: number;
  activeEnvelopes: number;
  budgets: BudgetRow[];
  names: Map<string, string>;
}) {
  const t = fr.treasury.overview.available;
  return (
    <MetricCard
      title={t.title}
      value={amount(availableCents)}
      caption={t.caption(activeEnvelopes)}
      action={
        <MetricCardLink href={routes.financeBudgets}>{t.all}</MetricCardLink>
      }
    >
      {budgets.length === 0 ? (
        <p className="text-body-md text-[color:var(--text-secondary)]">
          {t.empty}
        </p>
      ) : (
        <ul className="grid gap-4">
          {budgets.map((row) => {
            const title = names.get(row.id) ?? "";
            const envelope = row.envelopeCents ?? 0;
            const over = (row.restCents ?? 0) < 0;
            return (
              <li key={row.id} className="grid gap-1.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-body-md font-medium">
                    {title}
                  </span>
                  <RestAmount
                    cents={row.restCents ?? 0}
                    className={cn(
                      "shrink-0 text-caption",
                      !over && "text-[color:var(--text-secondary)]",
                    )}
                  />
                </span>
                <ProgressBar
                  value={row.engagedCents}
                  max={envelope}
                  tone={over ? "error" : "ink"}
                  label={t.progress(
                    title,
                    amount(row.engagedCents),
                    amount(envelope),
                  )}
                />
              </li>
            );
          })}
        </ul>
      )}
    </MetricCard>
  );
}

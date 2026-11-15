import { MetricCard, MetricCardLink } from "@/components/ui/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { routes } from "@/lib/auth/redirects";
import type { BudgetRow } from "@/lib/finance/aggregate";
import { treasury as treasuryText } from "@/lib/i18n/fr/treasury";
import { formatAmount } from "@/lib/utils/money";

const fr = { treasury: treasuryText };

const amount = (cents: number) => formatAmount(cents, { ht: false });

/**
 * « Disponible sur les budgets » on the overview: what the live project
 * envelopes still allow, then the three nearest their limit, each with its
 * bar (engaged on envelope, red past it).
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
                  <span
                    className={`shrink-0 text-caption whitespace-nowrap tabular-nums ${
                      over
                        ? "text-[color:var(--error)]"
                        : "text-[color:var(--text-secondary)]"
                    }`}
                  >
                    {t.row(amount(row.engagedCents), amount(envelope))}
                  </span>
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

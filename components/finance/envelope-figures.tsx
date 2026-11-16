import { ConsumptionMeter } from "@/components/finance/consumption-meter";
import {
  engagedOf,
  type EnvelopeRow,
  type Totals,
} from "@/lib/finance/envelopes";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/utils/money";

const t = financeBudgets.figures;
const amount = (cents: number) => formatAmount(cents, { ht: false });
const signed = (cents: number) =>
  `${cents > 0 ? "+" : cents < 0 ? "−" : ""}${amount(Math.abs(cents))}`;

/**
 * A budget's figures in one card (new style, lot 4, after the proto's
 * budget page): what is left, large (« Dépassé de X » once over), with how
 * much is used; then the figures in a strip — initial budget, revisions,
 * planned, spent, paid, rebillable, gap, PDS's share — the same figures and
 * words as the posts' table below (`engagedOf`: committed, invoiced and
 * paid). What is empty is not shown. `totals` follows the page's status
 * filter; what is left is the budget's, whole.
 */
export function EnvelopeFigures({
  row,
  totals,
}: {
  row: EnvelopeRow;
  totals: Totals;
}) {
  const budget = row.currentCents;
  const share = budget ? row.engagedCents / budget : 0;
  const percent = Math.round(share * 100);
  const figures = [
    [t.initial, row.initialCents === null ? "—" : amount(row.initialCents)],
    ...(row.revisionsCents ? [[t.revisions, signed(row.revisionsCents)]] : []),
    [t.planned, amount(totals.forecastCents)],
    [t.spent, amount(engagedOf(totals))],
    [t.paid, amount(totals.paidCents)],
    [t.gap, signed(totals.projectedCents - totals.forecastCents)],
    ...(totals.rebillableCents > 0
      ? [[t.rebill, amount(totals.rebillableCents)]]
      : []),
    ...(row.pdsShareBp < 10000
      ? [[t.pds(row.pdsShareBp / 100), amount(row.pdsPartCents)]]
      : []),
  ] as const;

  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-2xl border border-[color:var(--border-default)] bg-card p-5">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-caption text-[color:var(--text-secondary)]">
            {t.rest}
          </h2>
          {budget === null ? (
            <p className="text-body-md text-[color:var(--text-secondary)]">
              {t.noEnvelope}
            </p>
          ) : (
            <>
              <p
                className={cn(
                  "text-display-lg tabular-nums",
                  (row.restCents ?? 0) < 0 && "text-[color:var(--error)]",
                )}
              >
                {(row.restCents ?? 0) < 0
                  ? t.over(amount(-(row.restCents ?? 0)))
                  : amount(row.restCents ?? 0)}
              </p>
              <p className="text-caption text-[color:var(--text-tertiary)]">
                {t.restOf(amount(budget), percent)}
              </p>
            </>
          )}
        </div>
        {budget !== null && (
          <ConsumptionMeter
            share={share}
            label={t.used(row.name, percent)}
            className="mb-2 h-2 min-w-48 flex-1"
          />
        )}
      </div>
      <dl className="grid grid-cols-2 border-t border-[color:var(--border-hairline)] sm:grid-cols-3 lg:grid-cols-4">
        {figures.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5 py-3 pr-3">
            <dt className="text-micro text-[color:var(--text-tertiary)]">
              {label}
            </dt>
            <dd className="m-0 text-body-md tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

import { ConsumptionMeter } from "@/components/finance/consumption-meter";
import type { EnvelopeRow, Totals } from "@/lib/finance/envelopes";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/utils/money";

const t = financeBudgets.figures;
const amount = (cents: number) => formatAmount(cents, { ht: false });
const signed = (cents: number) =>
  `${cents > 0 ? "+" : cents < 0 ? "−" : ""}${amount(Math.abs(cents))}`;

/**
 * An envelope's figures in one card (new style, lot 4, after the proto's
 * budget page): what is left, large, with how much is used; then the ticket's
 * figures in a strip — initial budget, revisions, planned, committed,
 * invoiced, paid, rebillable, gap to the forecast, PDS's share. `totals`
 * follows the page's status filter; what is left is the envelope's, whole.
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
    [t.revisions, row.revisionsCents ? signed(row.revisionsCents) : "—"],
    [t.planned, amount(totals.plannedCents)],
    [t.committed, amount(totals.committedCents)],
    [t.invoiced, amount(totals.invoicedCents)],
    [t.paid, amount(totals.paidCents)],
    [t.rebill, amount(totals.rebillableCents)],
    [t.gap, signed(totals.projectedCents - totals.forecastCents)],
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
                {amount(row.restCents ?? 0)}
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

import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { EnvelopeTable } from "@/components/finance/envelope-table";
import { FinanceLinesCard } from "@/components/finance/finance-lines-card";
import { MonthChart } from "@/components/finance/month-chart";
import { CardRow, ListCard } from "@/components/ui/list-card";
import { RankedBars } from "@/components/ui/ranked-bars";
import { StatTiles } from "@/components/ui/stat-tiles";
import { routes } from "@/lib/auth/redirects";
import type { FinancePeriod } from "@/lib/finance/period";
import type { FinanceData } from "@/lib/finance/types";
import type { FinanceView } from "@/lib/finance/view";
import { finance } from "@/lib/i18n/fr/finance";
import { formatAmount } from "@/lib/utils/money";

const fr = { finance };

/**
 * The Finance page under its header: four figures, the months, where the
 * money went (postes, artists), the budgets against their envelopes; on the
 * side what asks to act (invoices to pay, proofs missing) and the largest
 * spends. Patterns of the references of 12/11/2026 (Monarch, Copilot Money,
 * Origin, Wise), docs/ARCHITECTURE.md « Finance ».
 */
export function FinanceOverview({
  data,
  view,
  period,
  today,
  canOpenExpenses,
}: {
  data: FinanceData;
  view: FinanceView;
  period: FinancePeriod;
  today: string;
  canOpenExpenses: boolean;
}) {
  const t = fr.finance;
  const { sums } = view;
  const amount = (cents: number) => formatAmount(cents, { ht: false });
  const others = (count: number, value: number) => ({
    label: t.others(count),
    display: amount(value),
  });

  return (
    <>
      <StatTiles
        columns={4}
        stats={[
          {
            label: t.tiles.engaged,
            value: formatAmount(sums.engagedCents),
            hint:
              period.key === "tout"
                ? sums.estimatedCents > 0
                  ? t.tiles.estimated(amount(sums.estimatedCents))
                  : undefined
                : view.change === null
                  ? t.tiles.noChange
                  : t.tiles.change(view.change, t.previous[period.key]),
          },
          {
            label: t.tiles.paid,
            value: formatAmount(sums.paidCents),
            hint:
              sums.engagedCents > 0
                ? t.tiles.paidShare(
                    Math.round((sums.paidCents / sums.engagedCents) * 100),
                  )
                : undefined,
          },
          {
            label: t.tiles.toPay,
            value: formatAmount(view.toPayCents),
            hint: t.tiles.overdue(view.lateCount),
          },
          {
            label: t.tiles.overruns,
            value: String(view.overruns.projects + view.overruns.artists),
            hint: t.tiles.overrunsHint(
              view.overruns.projects,
              view.overruns.artists,
            ),
          },
        ]}
      />
      <div className="grid items-start gap-[var(--section-gap)] lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-[var(--section-gap)]">
          <MonthChart
            bars={view.bars}
            highlight={
              period.from && period.to && period.key !== "annee"
                ? { from: period.from, to: period.to }
                : null
            }
          />
          <div className="grid gap-[var(--section-gap)] md:grid-cols-2 md:gap-6">
            <PageSection id="finance-families" title={t.byFamily.title}>
              <RankedBars
                label={t.byFamily.title}
                items={view.families}
                others={others}
                share={t.ofEngaged}
                empty={t.rankEmpty}
              />
            </PageSection>
            <PageSection id="finance-artists" title={t.byArtist.title}>
              <RankedBars
                label={t.byArtist.title}
                items={view.artists}
                others={others}
                share={t.ofEngaged}
                empty={t.rankEmpty}
              />
            </PageSection>
          </div>
          <PageSection id="finance-projects" title={t.projects.title}>
            {view.projectRows.length > 0 ? (
              <EnvelopeTable
                rows={view.projectRows}
                nameLabel={t.projects.name}
              />
            ) : (
              <EmptyNote>{t.projects.empty}</EmptyNote>
            )}
          </PageSection>
          <PageSection id="finance-envelopes" title={t.artists.title}>
            {view.artistRows.length > 0 ? (
              <EnvelopeTable
                rows={view.artistRows}
                nameLabel={t.artists.name}
              />
            ) : (
              <EmptyNote>{t.artists.empty}</EmptyNote>
            )}
          </PageSection>
        </div>
        <aside className="flex min-w-0 flex-col gap-4">
          <FinanceLinesCard
            kind="toPay"
            lines={data.toPay}
            today={today}
            targetOf={view.targetOf}
            hrefOf={view.hrefOf}
          />
          <FinanceLinesCard
            kind="largest"
            lines={data.largest}
            today={today}
            targetOf={view.targetOf}
            hrefOf={view.hrefOf}
          />
          <ListCard
            title={t.noProof.title}
            count={sums.noProof}
            empty={sums.noProof === 0 ? t.noProof.none : undefined}
          >
            <CardRow
              href={
                canOpenExpenses
                  ? `${routes.expenses}?vue=sans-justificatif`
                  : null
              }
              main={t.noProof.body(sums.noProof)}
              sub={canOpenExpenses ? t.noProof.open : undefined}
            />
          </ListCard>
        </aside>
      </div>
    </>
  );
}

import { DrawsTable } from "@/components/finance/draws-table";
import { OrchardCard, PayLaterCard } from "@/components/finance/engine-cards";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { FundingActions } from "@/components/finance/funding-buttons";
import { LinkRows } from "@/components/ui/link-rows";
import { ShowsList } from "@/components/finance/shows-list";
import { FormMessage } from "@/components/auth/form-message";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { creditUsed, liveShows, orchardAdvances } from "@/lib/finance/engines";
import { isOpen, remainingCents } from "@/lib/finance/money-in";
import { payLaterSummary } from "@/lib/finance/pay-later";
import { loadSpends } from "@/lib/finance/spend-queries";
import { spendsHref } from "@/lib/finance/spend-links";
import { rebillMissing } from "@/lib/finance/spends";
import { addDays } from "@/lib/finance/treasury";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { fundings as t } from "@/lib/i18n/fr/fundings";
import { parisPlace } from "@/lib/utils/calendar-period";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const HORIZON = 90;

/**
 * Finance › Financements (Ibé's ticket, maquette 7, lot 5), laid out as the
 * proto's page (Sacha 15/11/2026): two cards for the engines (The Orchard's
 * contract, advances and title count, Pay Later's credit and installments),
 * the titles the Distribution delivered to The Orchard (16/11/2026), a
 * card per show format with its planned shows, then the Pay Later draws
 * (where one entered by mistake is removed) and a line each for the
 * rebillings and the reserve. The engines compute; the Finance enters the
 * facts.
 */
export default async function FinanceFundingsPage() {
  const today = parisPlace(new Date()).day;
  const [access, data, spends] = await allInOrder([
    requirePermission("read_finance"),
    loadTreasury(addDays(today, HORIZON)),
    loadSpends(),
  ]);
  const canManage = can(access, "manage_finance");
  const engines = data.engines;
  const orchard = orchardAdvances(engines, today);
  const shows = liveShows(engines);
  const formats = engines.formats.filter(
    (f) => !f.archived || shows.some((s) => s.formatId === f.id),
  );
  const lines = engines.creditLines.filter((l) => !l.archived);
  const limit = lines.reduce((s, l) => s + l.limitCents, 0);
  const used = lines.reduce(
    (s, l) => s + creditUsed(l, engines.draws, today),
    0,
  );
  const rebillings = data.incomes.filter(
    (i) => i.kind === "rebilling" && isOpen(i),
  );
  const missing = spends.spends.filter(rebillMissing);
  const drawn = new Set(
    engines.draws.flatMap((d) => (d.lineId ? [d.lineId] : [])),
  );
  const drawable = spends.spends.filter(
    (s) => !s.refused && s.status !== "paid" && !drawn.has(s.id),
  );

  return (
    <FinanceFrame
      section="fundings"
      action={
        canManage ? (
          <FundingActions
            formats={engines.formats}
            settings={engines.settings}
            lines={engines.creditLines}
            spends={drawable}
          />
        ) : undefined
      }
    >
      {(data.error || spends.error) && (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <OrchardCard
          trancheCents={engines.settings.orchardTrancheCents}
          orchard={orchard}
          canManage={canManage}
        />
        <PayLaterCard
          limitCents={limit}
          usedCents={used}
          hasLines={lines.length > 0}
          summary={payLaterSummary(engines.draws, today)}
        />
      </div>
      {formats.length === 0 ? (
        <EmptyNote>{t.formats.noFormat}</EmptyNote>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {formats.map((format) => (
            <MetricCard
              key={format.id}
              title={format.name}
              action={
                <StatusBadge tone="slate">
                  {t.formats.cost(
                    amount(format.costCents),
                    t.formats.unitOf(format.name),
                  )}
                </StatusBadge>
              }
            >
              <ShowsList
                shows={shows.filter((s) => s.formatId === format.id)}
                format={format}
                formats={engines.formats}
                canManage={canManage}
              />
            </MetricCard>
          ))}
        </div>
      )}
      {engines.orchardDeliveries.length > 0 && (
        <PageSection id="orchard" title={t.orchard.deliveries.title}>
          <LinkRows
            rows={engines.orchardDeliveries.map((d) => ({
              key: `${d.projectId}-${d.release ?? ""}-${d.day}`,
              href: null,
              main: t.orchard.deliveries.row(d.project, d.release),
              sub: t.orchard.deliveries.sub(
                formatShortDay(d.day, { bare: true }),
                d.titles,
              ),
            }))}
          />
        </PageSection>
      )}
      {engines.draws.length > 0 && (
        <PageSection id="pay-later" title={t.payLater.draws}>
          <DrawsTable
            draws={engines.draws}
            today={today}
            canManage={canManage}
          />
        </PageSection>
      )}
      <MetricCard title={t.rebill.title}>
        <LinkRows
          rows={[
            {
              key: "rebill",
              href: spendsHref({ statut: "a-refacturer" }),
              main: t.rebill.row,
              sub:
                rebillings.length || missing.length
                  ? [
                      t.rebill.expected(rebillings.length),
                      missing.length > 0 && t.rebill.missing(missing.length),
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : t.rebill.none,
              end: (
                <span className="text-body-md tabular-nums">
                  {amount(
                    rebillings.reduce((s, i) => s + remainingCents(i), 0),
                  )}
                </span>
              ),
            },
            {
              key: "reserve",
              href: routes.financeTreasury,
              main: t.reserve.title,
              sub:
                data.reserveCents === 0
                  ? t.reserve.none
                  : t.reserve.caption(amount(data.reserveCents)),
              end: (
                <span className="text-body-md tabular-nums">
                  {amount(data.reserveCents)}
                </span>
              ),
            },
          ]}
        />
      </MetricCard>
    </FinanceFrame>
  );
}

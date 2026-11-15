import { DrawsTable } from "@/components/finance/draws-table";
import {
  OrchardSettingsButton,
  PayLaterButtons,
  ShowButtons,
} from "@/components/finance/funding-buttons";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { ShowsTable } from "@/components/finance/shows-table";
import { FormMessage } from "@/components/auth/form-message";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { MetricCard, MetricCardLink } from "@/components/ui/metric-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { creditUsed, liveShows, orchardAdvances } from "@/lib/finance/engines";
import { isOpen, remainingCents } from "@/lib/finance/money-in";
import { loadSpends } from "@/lib/finance/spend-queries";
import { rebillMissing } from "@/lib/finance/spends";
import { addDays, computeTreasury } from "@/lib/finance/treasury";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { fundings as t } from "@/lib/i18n/fr/fundings";
import { parisPlace } from "@/lib/utils/calendar-period";
import { formatShortDay } from "@/lib/utils/day";
import { formatAmount } from "@/lib/utils/money";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const amount = (cents: number) => formatAmount(cents, { ht: false });
const day = (value: string) => formatShortDay(value, { bare: true });
const HORIZON = 90;

/**
 * Finance › Financements (Ibé's ticket, maquette 7, lot 5): the Orchard
 * advances the planned shows trigger, the shows themselves (moved here, the
 * forecast follows), the Pay Later lines and draws, the rebillings and the
 * reserve. The engines compute; the Finance enters the facts.
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
  const next = orchard.advances[0];
  // Today's count, not the one after the planned shows.
  const counted = engines.settings.orchardTitlesCounted;
  const shows = liveShows(engines);
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
  const treasury = computeTreasury({ ...data, today, horizon: HORIZON });

  return (
    <FinanceFrame section="fundings">
      {(data.error || spends.error) && (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t.orchard.title}
          value={t.orchard.counted(counted, orchard.per)}
          caption={t.orchard.caption(
            amount(engines.settings.orchardTrancheCents),
            orchard.per,
          )}
          action={
            canManage ? (
              <OrchardSettingsButton settings={engines.settings} />
            ) : undefined
          }
        >
          <div className="flex flex-col gap-2">
            <ProgressBar
              value={Math.min(counted, orchard.per)}
              max={orchard.per}
              label={t.orchard.counted(counted, orchard.per)}
            />
            <p className="text-caption text-[color:var(--text-secondary)]">
              {next
                ? next.show
                  ? t.orchard.next(amount(next.cents), day(next.day))
                  : t.orchard.due
                : t.orchard.nextUnknown}
            </p>
          </div>
        </MetricCard>
        <MetricCard
          title={t.payLater.title}
          value={lines.length ? amount(limit - used) : "—"}
          caption={
            lines.length
              ? t.payLater.available(amount(limit - used), amount(limit))
              : t.payLater.empty
          }
        >
          {lines.length > 0 && (
            <ProgressBar
              value={used}
              max={limit}
              label={t.payLater.used(amount(used))}
            />
          )}
        </MetricCard>
        <MetricCard
          title={t.rebill.title}
          value={amount(rebillings.reduce((s, i) => s + remainingCents(i), 0))}
          caption={
            rebillings.length || missing.length
              ? [
                  t.rebill.expected(rebillings.length),
                  missing.length > 0 && t.rebill.missing(missing.length),
                ]
                  .filter(Boolean)
                  .join(" · ")
              : t.rebill.none
          }
          action={
            <MetricCardLink href={`${routes.financeSpends}?vue=a-refacturer`}>
              {t.rebill.open}
            </MetricCardLink>
          }
        />
        <MetricCard
          title={t.reserve.title}
          value={amount(data.reserveCents)}
          caption={
            data.reserveCents === 0
              ? t.reserve.none
              : treasury
                ? t.reserve.low(
                    amount(treasury.low.cents),
                    day(treasury.low.day),
                  )
                : t.reserve.caption(amount(data.reserveCents))
          }
          action={
            <MetricCardLink href={routes.financeTreasury}>
              {t.reserve.open}
            </MetricCardLink>
          }
          danger={Boolean(
            treasury &&
            data.reserveCents > 0 &&
            treasury.low.cents < data.reserveCents,
          )}
        />
      </div>
      <PageSection
        id="shows"
        title={t.shows.title}
        description={t.shows.caption}
        action={
          canManage ? <ShowButtons formats={engines.formats} /> : undefined
        }
      >
        {engines.formats.length > 0 && (
          <p className="text-caption text-[color:var(--text-secondary)]">
            {engines.formats
              .filter((f) => !f.archived)
              .map(
                (f) =>
                  `${f.name} : ${t.formats.line(amount(f.costCents), f.provisionalTitles)}`,
              )
              .join(" · ")}
          </p>
        )}
        {shows.length === 0 ? (
          <EmptyNote>{t.shows.empty}</EmptyNote>
        ) : (
          <ShowsTable
            shows={shows}
            formats={engines.formats}
            canManage={canManage}
          />
        )}
      </PageSection>
      <PageSection
        id="pay-later"
        title={t.payLater.title}
        action={
          canManage ? (
            <PayLaterButtons lines={engines.creditLines} spends={drawable} />
          ) : undefined
        }
      >
        {engines.draws.length === 0 ? (
          <EmptyNote>
            {lines.length ? t.payLater.noDraws : t.payLater.empty}
          </EmptyNote>
        ) : (
          <DrawsTable
            draws={engines.draws}
            today={today}
            canManage={canManage}
          />
        )}
      </PageSection>
    </FinanceFrame>
  );
}

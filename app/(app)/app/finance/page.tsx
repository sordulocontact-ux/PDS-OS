import { FormMessage } from "@/components/auth/form-message";
import { QuickExpenseButton } from "@/components/budget/quick-expense-button";
import { CockpitOverview } from "@/components/finance/cockpit-overview";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { IncomeAddButton } from "@/components/finance/incomes-table";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { cockpit } from "@/lib/finance/cockpit";
import { loadFinanceWatch } from "@/lib/finance/watch-queries";
import {
  TREASURY_HORIZONS,
  asHorizon,
  computeTreasury,
} from "@/lib/finance/treasury";
import { treasury as t } from "@/lib/i18n/fr/treasury";
import { parisPlace } from "@/lib/utils/calendar-period";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.titles.overview };

/**
 * Finance › Vue d'ensemble (Ibé's ticket « Cockpit Finance », maquette 1,
 * 13/11/2026): the whole of Finance at a glance, how much there is, what
 * comes in and goes out, what the budgets allow, where to act. For the
 * direction and the Finance (read_finance); the Finance enters money in and
 * spends from here (manage_finance). Every figure is computed by code
 * (lib/finance/treasury.ts, cockpit.ts); the cards' totals and rows come
 * from the same lines, the budgets and the alerts from the same lists as
 * Trésorerie and the bell (16/11/2026). Sacha 15/11/2026: a Finance overview
 * again, not an app's home; the greeting and sentence cards (lots 1 and 7:
 * FinanceHome, FinanceBriefCard, FinanceAsk) wait for the general overview.
 */
export default async function FinanceOverviewPage({
  searchParams,
}: PageProps<"/app/finance">) {
  const today = parisPlace(new Date()).day;
  const [access, params] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
  ]);
  const horizon = asHorizon(params.horizon);
  // The alerts (the bell's, the same count), the treasury read as far as
  // the longest horizon and the budgets with their spends, in one round.
  const watch = await loadFinanceWatch(today);
  const { treasury: data, budgets } = watch;
  const canManage = can(access, "manage_finance");
  // As much of the past as of the future (Sacha 24/11/2026).
  const treasury = computeTreasury({
    ...data,
    today,
    horizon,
    past: horizon,
  });
  const names = new Map([
    ...data.targets.map((x) => [x.id, x.name] as const),
    ...budgets.envelopes.map((e) => [e.id, e.name] as const),
  ]);

  return (
    <FinanceFrame section="overview">
      {watch.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {/* The tools on one row, as Trésorerie's: the horizon on the left,
          the actions on the right. */}
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedLinks
          label={t.page.horizon}
          options={TREASURY_HORIZONS.map((days) => ({
            key: String(days),
            href: `${routes.finance}?horizon=${days}`,
            label: t.page.horizonOption(days),
            current: days === horizon,
          }))}
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <QuickExpenseButton />
          {canManage && access.organizationId && (
            <IncomeAddButton
              outline
              targets={data.targets}
              organizationId={access.organizationId}
              ownerId={access.personId}
            />
          )}
        </div>
      </div>
      <CockpitOverview
        treasury={treasury}
        view={cockpit({
          incomes: data.incomes,
          upcoming: data.upcoming,
          envelopes: budgets.envelopes,
          spends: budgets.spends,
          alerts: watch.alerts,
          engines: data.engines,
          today,
          horizon,
        })}
        horizon={horizon}
        names={names}
        canManage={canManage}
      />
    </FinanceFrame>
  );
}

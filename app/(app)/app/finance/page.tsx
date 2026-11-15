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
import { financePeriod } from "@/lib/finance/period";
import { loadFinance } from "@/lib/finance/queries";
import { loadSpends } from "@/lib/finance/spend-queries";
import {
  TREASURY_HORIZONS,
  addDays,
  asHorizon,
  computeTreasury,
} from "@/lib/finance/treasury";
import { loadTreasury } from "@/lib/finance/treasury-queries";
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
 * (lib/finance/treasury.ts, cockpit.ts). Sacha 15/11/2026: a Finance overview
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
  const [data, spending, spends] = await allInOrder([
    loadTreasury(addDays(today, horizon)),
    loadFinance(financePeriod("tout", today)),
    loadSpends(),
  ]);
  const canManage = can(access, "manage_finance");
  const treasury = computeTreasury({ ...data, today, horizon });
  const names = new Map([
    ...spending.projects.map((p) => [p.id, p.title] as const),
    ...data.targets.map((x) => [x.id, x.name] as const),
  ]);

  return (
    <FinanceFrame section="overview">
      {(data.error || spending.error) && (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      )}
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
          <QuickExpenseButton outline />
          {canManage && access.organizationId && (
            <IncomeAddButton
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
          treasury,
          incomes: data.incomes,
          upcoming: data.upcoming,
          spending,
          spends: spends.spends,
          engines: data.engines,
          today,
          horizon,
        })}
        horizon={horizon}
        names={names}
        canManage={canManage}
        canOpenExpenses={can(access, "read_artist_budgets")}
      />
    </FinanceFrame>
  );
}

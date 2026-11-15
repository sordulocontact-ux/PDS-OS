import { FormMessage } from "@/components/auth/form-message";
import { CockpitOverview } from "@/components/finance/cockpit-overview";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { IncomeAddButton } from "@/components/finance/incomes-table";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { cockpit } from "@/lib/finance/cockpit";
import { financePeriod } from "@/lib/finance/period";
import { loadFinance } from "@/lib/finance/queries";
import {
  DEFAULT_HORIZON,
  addDays,
  computeTreasury,
} from "@/lib/finance/treasury";
import { loadSpends } from "@/lib/finance/spend-queries";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { treasury as t } from "@/lib/i18n/fr/treasury";
import { parisPlace } from "@/lib/utils/calendar-period";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.titles.overview };

/**
 * Finance › Vue d'ensemble (Ibé's ticket « Cockpit Finance », maquette 1,
 * 13/11/2026): how much there is, what comes in and goes out, where to act.
 * For the direction and the Finance (read_finance); the Finance enters
 * money in from here (manage_finance). Every figure is computed by code
 * (lib/finance/treasury.ts, cockpit.ts).
 */
export default async function FinanceOverviewPage() {
  const today = parisPlace(new Date()).day;
  const horizon = DEFAULT_HORIZON;
  const [access, data, spending, spends] = await allInOrder([
    requirePermission("read_finance"),
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
    <FinanceFrame
      section="overview"
      action={
        canManage && access.organizationId ? (
          <IncomeAddButton
            targets={data.targets}
            organizationId={access.organizationId}
            ownerId={access.personId}
          />
        ) : undefined
      }
    >
      {(data.error || spending.error) && (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      )}
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

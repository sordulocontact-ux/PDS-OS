import { IconCreditCard, IconPaperPlane2 } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { QuickExpenseButton } from "@/components/budget/quick-expense-button";
import { FinanceFrame } from "@/components/finance/finance-frame";
import { FinanceHome } from "@/components/finance/home/finance-home";
import { IncomeAddButton } from "@/components/finance/incomes-table";
import { buttonVariants } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { cockpit } from "@/lib/finance/cockpit";
import { financePeriod } from "@/lib/finance/period";
import { loadFinance } from "@/lib/finance/queries";
import { asHorizon, addDays, computeTreasury } from "@/lib/finance/treasury";
import { loadSpends } from "@/lib/finance/spend-queries";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { financeHome } from "@/lib/i18n/fr/finance-home";
import { treasury as t } from "@/lib/i18n/fr/treasury";
import { parisPlace } from "@/lib/utils/calendar-period";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.titles.overview };

/**
 * Finance › Vue d'ensemble (Ibé's ticket « Cockpit Finance », maquette 1,
 * 13/11/2026): how much there is, what comes in and goes out, where to act.
 * For the direction and the Finance (read_finance); the Finance enters
 * money in from here (manage_finance). Every figure is computed by code
 * (lib/finance/treasury.ts, cockpit.ts). New style (Sacha 15/11/2026,
 * docs/FINANCE-V2.md): a greeting, then one card per thing to know.
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
  const quiet = buttonVariants({ variant: "outline", size: "lg" });

  return (
    <FinanceFrame section="overview" header={false}>
      {(data.error || spending.error) && (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      )}
      <FinanceHome
        firstName={access.firstName ?? null}
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
        canOpenExpenses={can(access, "read_artist_budgets")}
        actions={
          <>
            <QuickExpenseButton outline />
            {canManage && access.organizationId && (
              <IncomeAddButton
                outline
                targets={data.targets}
                organizationId={access.organizationId}
                ownerId={access.personId}
              />
            )}
            {canManage && (
              <>
                <ViewLink href={routes.financeReconcile} className={quiet}>
                  <IconCreditCard aria-hidden data-icon="inline-start" />
                  {financeHome.importStatement}
                </ViewLink>
                <ViewLink href={routes.financeExports} className={quiet}>
                  <IconPaperPlane2 aria-hidden data-icon="inline-start" />
                  {financeHome.export}
                </ViewLink>
              </>
            )}
          </>
        }
      />
    </FinanceFrame>
  );
}

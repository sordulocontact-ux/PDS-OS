import { IconChartBarTrendUp } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { can } from "@/lib/auth/access";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  FINANCE_PERIODS,
  asFinancePeriod,
  financePeriod,
} from "@/lib/finance/period";
import { loadFinance } from "@/lib/finance/queries";
import { financeView } from "@/lib/finance/view";
import { finance as t } from "@/lib/i18n/fr/finance";
import { parisPlace } from "@/lib/utils/calendar-period";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

/**
 * Finance (Sacha, 12/11/2026): the team's spending as a whole, every project
 * and every artist, for the direction, the business managers and business
 * (read_finance). Totals by period (this month, quarter, year, everything),
 * the months, the postes and artists, the budgets against their envelopes,
 * what is to pay. Every figure is computed by code from the budget lines
 * (lib/finance/); Dépenses stays the list of the lines themselves.
 */
export default async function FinancePage({
  searchParams,
}: PageProps<"/app/finance">) {
  const [access, params] = await allInOrder([
    requirePermission("read_finance"),
    searchParams,
  ]);
  const today = parisPlace(new Date()).day;
  const period = financePeriod(asFinancePeriod(params.periode), today);
  const data = await loadFinance(period);
  const view = financeView(data, period, today, {
    projects: can(access, "view_all_projects"),
    artists: can(access, "read_artist_budgets"),
  });

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.description}
        action={
          <SegmentedLinks
            label={t.periods.label}
            options={FINANCE_PERIODS.map((key) => ({
              key,
              href: `${routes.finance}?periode=${key}`,
              label: t.periods[key],
              current: period.key === key,
            }))}
          />
        }
      />
      {data.error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {data.months.length === 0 && !data.error ? (
        <EmptyState
          icon={IconChartBarTrendUp}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <FinanceOverview
          data={data}
          view={view}
          period={period}
          today={today}
          canOpenExpenses={can(access, "read_artist_budgets")}
        />
      )}
    </PageContainer>
  );
}

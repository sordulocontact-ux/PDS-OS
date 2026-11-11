import { IconMoneyBillCoin } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { ExpensesList } from "@/components/budget/expenses-list";
import { QuickExpenseButton } from "@/components/budget/quick-expense-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters } from "@/components/ui/url-filters";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  expenseFilterGroups,
  expenseFiltersOf,
  matchesExpense,
} from "@/lib/budget/expense-filters";
import { EXPENSES_LIMIT, loadExpenses } from "@/lib/budget/expenses-queries";
import { lacksProof } from "@/lib/budget/types";
import { expenses as t } from "@/lib/i18n/fr/expenses";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const NO_PROOF = "sans-justificatif";

/**
 * Dépenses (BUD 3): every spend the reader may see, of the projects (their
 * budget's readers) and the artists (the artists' budgets' readers), the
 * same row as every Budget; tabs Toutes / Sans justificatif, filters by
 * artist, project, poste, author and month, an instant search.
 */
export default async function ExpensesPage({
  searchParams,
}: PageProps<"/app/expenses">) {
  const [access, params] = await allInOrder([
    requirePermission("read_artist_budgets"),
    searchParams,
  ]);
  const { expenses, truncated, error } = await loadExpenses(access.personId);
  const filters = expenseFiltersOf(params);
  const noProof = params.vue === NO_PROOF;
  const filtering = Object.values(filters).some((value) => value !== null);
  // The tabs count what the filters keep; the filters offer what the tab
  // holds.
  const filtered = expenses.filter((e) => matchesExpense(e, filters));
  const ofView = noProof ? expenses.filter(lacksProof) : expenses;
  const shown = noProof ? filtered.filter(lacksProof) : filtered;

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.description}
        // The phone has it in its header already (BUD 4).
        action={
          <div className="hidden md:block">
            <QuickExpenseButton />
          </div>
        }
      />
      {error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {expenses.length === 0 ? (
        <EmptyState
          icon={IconMoneyBillCoin}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <DataTableViews
          label={t.views.label}
          views={[
            {
              href: viewHref(routes.expenses, filters),
              label: t.views.all,
              count: filtered.length,
              current: !noProof,
            },
            {
              href: viewHref(routes.expenses, { ...filters, vue: NO_PROOF }),
              label: t.views.noProof,
              count: filtered.filter(lacksProof).length,
              current: noProof,
            },
          ]}
        >
          <ExpensesList
            rows={shown}
            organizationId={access.organizationId}
            filters={
              <UrlFilters
                path={routes.expenses}
                params={{ vue: noProof ? NO_PROOF : null }}
                groups={expenseFilterGroups(ofView, filters)}
              />
            }
            empty={
              filtering ? (
                <EmptyState
                  icon={IconMoneyBillCoin}
                  title={t.filtersEmpty}
                  body={t.filtersEmptyBody}
                />
              ) : undefined
            }
          />
          {truncated && (
            <p className="text-sm text-muted-foreground">
              {t.truncated(EXPENSES_LIMIT)}
            </p>
          )}
        </DataTableViews>
      )}
    </PageContainer>
  );
}

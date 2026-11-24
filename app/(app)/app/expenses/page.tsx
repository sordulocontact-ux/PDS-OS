import { IconMoneyBillCoin } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { ArtistEnvelopeCard } from "@/components/budget/envelope/artist-envelope-card";
import { ExpensesList } from "@/components/budget/expenses-list";
import { QuickExpenseButton } from "@/components/budget/quick-expense-button";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters } from "@/components/ui/url-filters";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  expenseFilterGroups,
  expenseFiltersOf,
  matchesExpense,
} from "@/lib/budget/expense-filters";
import { artistIdByName } from "@/lib/budget/envelope-queries";
import { EXPENSES_LIMIT, loadExpenses } from "@/lib/budget/expenses-queries";
import { lacksProof } from "@/lib/budget/types";
import { expenses as t } from "@/lib/i18n/fr/expenses";
import { filterParamsOf, isFiltering } from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const NO_PROOF = "sans-justificatif";

/**
 * Dépenses (BUD 3): every spend the reader may see, of the projects (their
 * budget's readers) and the artists (the artists' budgets' readers), the
 * same row as every Budget; tabs Toutes / Sans justificatif, filters by
 * artist, project, poste, author and month, an instant search. Filtered on
 * one artist, its envelope comes first.
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
  const filtering = isFiltering(filters);
  // The tabs count what the filters keep; the filters offer what the tab
  // holds.
  const filtered = expenses.filter((e) => matchesExpense(e, filters));
  const ofView = noProof ? expenses.filter(lacksProof) : expenses;
  const shown = noProof ? filtered.filter(lacksProof) : filtered;
  // Filtered on one artist: its envelope above the list (what remains).
  const envelopeArtist = filters.artist.length === 1 ? filters.artist[0] : null;
  const envelopeArtistId = envelopeArtist
    ? await artistIdByName(envelopeArtist)
    : null;

  // The phone has it in its header already (BUD 4).
  const action = (
    <div className="hidden md:block">
      <QuickExpenseButton />
    </div>
  );

  return (
    <SectionFrame
      title={t.title}
      description={t.description}
      action={action}
      toolsAction={expenses.length > 0}
    >
      {error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {envelopeArtistId && envelopeArtist && (
        <ArtistEnvelopeCard
          artistId={envelopeArtistId}
          artistName={envelopeArtist}
        />
      )}
      {expenses.length === 0 ? (
        <EmptyState
          icon={IconMoneyBillCoin}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <DataTableViews
          label={t.views.label}
          pageAction={action}
          views={[
            {
              href: viewHref(routes.expenses, filterParamsOf(filters)),
              label: t.views.all,
              count: filtered.length,
              current: !noProof,
            },
            {
              href: viewHref(routes.expenses, {
                ...filterParamsOf(filters),
                vue: NO_PROOF,
              }),
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
    </SectionFrame>
  );
}

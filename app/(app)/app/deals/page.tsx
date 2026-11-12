import { IconScale } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { DealsList } from "@/components/deals/deals-list";
import { AskDealButton } from "@/components/deals/ask-deal-button";
import { NewDealButton } from "@/components/deals/new-deal-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters } from "@/components/ui/url-filters";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  DEAL_VIEWS,
  dealFilterGroups,
  dealFiltersOf,
  dealViewOf,
  inDealView,
  matchesDeal,
} from "@/lib/deals/filters";
import { loadValidators } from "@/lib/framing/related";
import { loadNewDealOptions } from "@/lib/deals/new-deal-options";
import { loadDeals } from "@/lib/deals/queries";
import { deals as t } from "@/lib/i18n/fr/deals";
import { todayInParis } from "@/lib/insights/dates";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: t.title };

const VIEW_LABELS = {
  open: t.views.open,
  "follow-up": t.views.followUp,
  signed: t.views.signed,
  abandoned: t.views.abandoned,
} as const;

/**
 * Deals (BIZ 4): ONE list of the deals the reader may see — his own for a
 * negotiator, every deal for the direction, his projects' for a project
 * manager — tabs En cours / À relancer / Signés / Abandonnés, filters by
 * stage, negotiator and project, an instant search. A list only: what each
 * deal asks of the reader is in Travail and the home (one source).
 */
export default async function DealsPage({
  searchParams,
}: PageProps<"/app/deals">) {
  const [access, params] = await allInOrder([requireApproved(), searchParams]);
  if (
    !can(access, "negotiate") &&
    !can(access, "validate") &&
    !can(access, "pilot_projects")
  )
    notFound();
  const { deals, error } = await loadDeals(access);
  const options = await loadNewDealOptions(
    access,
    new Set(
      deals.flatMap((d) =>
        d.participationId && d.stage !== "abandoned" ? [d.participationId] : [],
      ),
    ),
  );
  // Whoever negotiates without opening deals learns who opens them.
  const directors =
    !options && access.organizationId
      ? (await loadValidators(access.organizationId)).map((v) => v.name)
      : null;
  const today = todayInParis();
  const view = dealViewOf(params.vue);
  const filters = dealFiltersOf(params);
  const filtering = Object.values(filters).some((value) => value !== null);
  const filtered = deals.filter((d) => matchesDeal(d, filters));
  const ofView = deals.filter((d) => inDealView(d, view, today));
  const shown = filtered.filter((d) => inDealView(d, view, today));

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.description}
        action={
          options ? (
            <NewDealButton options={options} />
          ) : (
            directors && <AskDealButton directors={directors} />
          )
        }
      />
      {error && <FormMessage kind="error">{t.loadError}</FormMessage>}
      {deals.length === 0 ? (
        <EmptyState icon={IconScale} title={t.emptyTitle} body={t.emptyBody} />
      ) : (
        <DataTableViews
          label={t.views.label}
          views={DEAL_VIEWS.map((v) => ({
            href: viewHref(routes.deals, {
              ...filters,
              vue: v === "open" ? null : v,
            }),
            label: VIEW_LABELS[v],
            count: filtered.filter((d) => inDealView(d, v, today)).length,
            current: v === view,
          }))}
        >
          <DealsList
            rows={shown}
            today={today}
            filters={
              <UrlFilters
                path={routes.deals}
                params={{ vue: view === "open" ? null : view }}
                groups={dealFilterGroups(ofView, filters).filter(
                  // A closed tab holds one stage: no stage filter there.
                  (g) =>
                    g.key !== "etape" ||
                    view === "open" ||
                    view === "follow-up",
                )}
              />
            }
            empty={
              filtering ? (
                <EmptyState
                  icon={IconScale}
                  title={t.filtersEmpty}
                  body={t.filtersEmptyBody}
                />
              ) : undefined
            }
          />
        </DataTableViews>
      )}
    </PageContainer>
  );
}

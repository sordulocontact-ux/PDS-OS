import { IconHandshake } from "nucleo-sharp-essential";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { ContractsList } from "@/components/contracts/contracts-list";
import { NewContractButton } from "@/components/contracts/new-contract-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters, type UrlFilterGroup } from "@/components/ui/url-filters";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listContracts } from "@/lib/contracts/queries";
import {
  asContractView,
  CONTRACT_TYPES,
  CONTRACT_VIEW_KEYS,
  inContractView,
  type ContractRow,
} from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { filterParam, optionsOfNames } from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.contracts.title} · ${fr.app.name}` };

type ContractFilters = {
  type: string | null;
  project: string | null;
  artist: string | null;
  owner: string | null;
};

const matches = (contract: ContractRow, filters: ContractFilters) =>
  (!filters.type || contract.type === filters.type) &&
  (!filters.project || contract.projectTitle === filters.project) &&
  (!filters.artist || contract.artistName === filters.artist) &&
  (!filters.owner || contract.ownerName === filters.owner);

/**
 * Contracts (MVP "Contrats uniquement"): those the viewer follows, the
 * direction's all, and those of the projects they own. Tabs by state,
 * « Filtres » by type, project, artist and owner, an instant search.
 */
export default async function ContractsPage({
  searchParams,
}: PageProps<"/app/contracts">) {
  const [access, all, params] = await allInOrder([
    requireApproved(),
    listContracts(),
    searchParams,
  ]);
  const t = fr.contracts;
  const view = asContractView(params.view);
  const filters: ContractFilters = {
    type: filterParam(params.type),
    project: filterParam(params.project),
    artist: filterParam(params.artist),
    owner: filterParam(params.owner),
  };
  const filtering = Object.values(filters).some((value) => value !== null);
  const canCreate = can(access, "manage_contracts");
  const newButton = canCreate ? <NewContractButton /> : null;
  // The template library (Juridique 03), beside the button.
  const templatesLink = can(access, "manage_legal") ? (
    <Link
      href={routes.contractTemplates}
      className={buttonVariants({ variant: "outline", size: "lg" })}
    >
      {fr.legalContracts.templates.open}
    </Link>
  ) : null;

  if (!all)
    return (
      <PageContainer>
        <PageHeader title={t.title} description={t.description} />
        <FormMessage kind="error">{t.loadError}</FormMessage>
      </PageContainer>
    );

  // The tabs count what the filters keep; the filters offer what the tab
  // holds.
  const filtered = all.filter((contract) => matches(contract, filters));
  const ofView = view
    ? all.filter((contract) => inContractView(contract.state, view))
    : all;
  const shown = view
    ? filtered.filter((contract) => inContractView(contract.state, view))
    : filtered;

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.description}
        action={
          templatesLink || all.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {templatesLink}
              {all.length > 0 && newButton}
            </div>
          ) : null
        }
      />
      {all.length === 0 ? (
        <EmptyState
          icon={IconHandshake}
          title={t.emptyTitle}
          body={canCreate ? t.emptyBody : t.emptyBodyReadOnly}
          action={newButton}
        />
      ) : (
        <DataTableViews
          label={t.viewsLabel}
          views={[
            {
              href: viewHref(routes.contracts, filters),
              label: t.views.all,
              count: filtered.length,
              current: view === null,
            },
            ...CONTRACT_VIEW_KEYS.map((key) => ({
              href: viewHref(routes.contracts, { ...filters, view: key }),
              label: t.views[key],
              count: filtered.filter((c) => inContractView(c.state, key))
                .length,
              current: view === key,
            })),
          ]}
          action={
            <UrlFilters
              path={routes.contracts}
              params={{ view }}
              groups={filterGroups(ofView, filters)}
            />
          }
        >
          {shown.length > 0 ? (
            // Remounted per view: the search starts empty on each one.
            <ContractsList
              key={[view, ...Object.values(filters)].join("-")}
              contracts={shown}
            />
          ) : filtering ? (
            <EmptyState
              icon={IconHandshake}
              title={t.filtersEmpty}
              body={t.filtersEmptyBody}
            />
          ) : (
            <EmptyState
              icon={IconHandshake}
              title={t.emptyViewTitle(view ? t.views[view] : t.views.all)}
              body={t.emptyViewBody}
            />
          )}
        </DataTableViews>
      )}
    </PageContainer>
  );
}

// Only what some contract of the tab holds.
function filterGroups(
  contracts: ContractRow[],
  current: ContractFilters,
): UrlFilterGroup[] {
  const t = fr.contracts;
  return [
    {
      key: "type",
      label: t.filters.typeLabel,
      allLabel: t.filters.typeAll,
      options: CONTRACT_TYPES.filter((type) =>
        contracts.some((c) => c.type === type),
      ).map((type) => ({ value: type, label: t.types[type] })),
      current: current.type,
    },
    {
      key: "project",
      label: t.filters.projectLabel,
      allLabel: t.filters.projectAll,
      options: optionsOfNames(contracts.map((c) => c.projectTitle)),
      current: current.project,
    },
    {
      key: "artist",
      label: t.filters.artistLabel,
      allLabel: t.filters.artistAll,
      options: optionsOfNames(contracts.map((c) => c.artistName)),
      current: current.artist,
    },
    {
      key: "owner",
      label: t.filters.ownerLabel,
      allLabel: t.filters.ownerAll,
      options: optionsOfNames(contracts.map((c) => c.ownerName)),
      current: current.owner,
    },
  ];
}

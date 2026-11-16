import { IconFile, IconHandshake } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { ContractsList } from "@/components/contracts/contracts-list";
import { NewContractButton } from "@/components/contracts/new-contract-button";
import { TemplateFormButton } from "@/components/contracts/templates/template-form-button";
import { TemplatesList } from "@/components/contracts/templates/templates-list";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { SectionFrame } from "@/components/shell/section-frame";
import { DataTableViews } from "@/components/ui/data-table";
import { UrlFilters } from "@/components/ui/url-filters";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import {
  contractFilterGroups,
  matchesContract,
  matchesTemplate,
  templateFilterGroups,
  type ContractFilters,
  type TemplateFilters,
} from "@/lib/contracts/list-filters";
import { listContracts } from "@/lib/contracts/queries";
import { asContractView } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { listTemplateSeries } from "@/lib/legal/contracts/templates";
import { filterParam } from "@/lib/ui/filter-options";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.contracts.title} · ${fr.app.name}` };

/**
 * Contracts and their templates, one page (Sacha, 30/10/2026): two tabs,
 * Contrats and Modèles (manage_legal, ?tab=templates). Contracts: the ones
 * the viewer follows, the direction's all, those of the projects they own;
 * « Filtres » by state (?view=, the former tabs), type, project, artist and
 * owner. Templates (ticket Juridique 03): by state and type. Each with an
 * instant search.
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
  const canTemplates = can(access, "manage_legal") && !!access.organizationId;
  const organizationId = access.organizationId ?? "";
  const templates = canTemplates ? await listTemplateSeries(access) : [];
  const onTemplates = canTemplates && params.tab === "templates";
  const canCreate = can(access, "manage_contracts");

  if (!all)
    return (
      <PageContainer>
        <PageHeader title={t.title} description={t.description} />
        <FormMessage kind="error">{t.loadError}</FormMessage>
      </PageContainer>
    );

  const filters: ContractFilters = {
    view: asContractView(params.view),
    type: filterParam(params.type),
    project: filterParam(params.project),
    artist: filterParam(params.artist),
    owner: filterParam(params.owner),
  };
  const tFilters: TemplateFilters = {
    state: filterParam(params.tstate),
    type: filterParam(params.ttype),
  };
  const shown = all.filter((c) => matchesContract(c, filters));
  const shownTemplates = templates.filter((x) => matchesTemplate(x, tFilters));
  const filtering = Object.values(filters).some((v) => v !== null);
  const action = onTemplates ? (
    <TemplateFormButton organizationId={organizationId} />
  ) : canCreate ? (
    <NewContractButton />
  ) : null;

  const contractsBody =
    all.length === 0 ? (
      <EmptyState
        icon={IconHandshake}
        title={t.emptyTitle}
        body={canCreate ? t.emptyBody : t.emptyBodyReadOnly}
        action={action}
      />
    ) : (
      <ContractsList
        contracts={shown}
        filters={
          <UrlFilters
            path={routes.contracts}
            params={{}}
            groups={contractFilterGroups(all, filters)}
          />
        }
        empty={
          <EmptyState
            icon={IconHandshake}
            title={filtering ? t.filtersEmpty : t.emptyViewTitle(t.views.all)}
            body={filtering ? t.filtersEmptyBody : t.emptyViewBody}
          />
        }
      />
    );

  const l = fr.legalContracts.templates;
  const templatesBody =
    templates.length === 0 ? (
      <EmptyState
        icon={IconFile}
        title={l.empty}
        body={l.emptyBody}
        action={action}
      />
    ) : (
      <TemplatesList
        templates={shownTemplates}
        organizationId={organizationId}
        filters={
          <UrlFilters
            path={routes.contracts}
            params={{ tab: "templates" }}
            groups={templateFilterGroups(templates, tFilters)}
          />
        }
        empty={
          <EmptyState
            icon={IconFile}
            title={l.filtersEmpty}
            body={t.filtersEmptyBody}
          />
        }
      />
    );

  return (
    <SectionFrame
      title={t.title}
      description={onTemplates ? l.description : t.description}
      action={all.length > 0 || templates.length > 0 ? action : null}
      toolsAction
    >
      <DataTableViews
        label={t.tabs.label}
        pageAction={all.length > 0 || templates.length > 0 ? action : null}
        views={
          canTemplates
            ? [
                {
                  href: routes.contracts,
                  label: t.tabs.contracts,
                  count: all.length,
                  current: !onTemplates,
                },
                {
                  href: viewHref(routes.contracts, { tab: "templates" }),
                  label: t.tabs.templates,
                  count: templates.length,
                  current: onTemplates,
                },
              ]
            : []
        }
      >
        {onTemplates ? templatesBody : contractsBody}
      </DataTableViews>
    </SectionFrame>
  );
}

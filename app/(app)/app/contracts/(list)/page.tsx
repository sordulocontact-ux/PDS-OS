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
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listContracts } from "@/lib/contracts/queries";
import {
  asContractView,
  CONTRACT_VIEW_KEYS,
  inContractView,
} from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { viewHref } from "@/lib/ui/view-href";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.contracts.title} · ${fr.app.name}` };

/**
 * Contracts (MVP "Contrats uniquement"): those the viewer follows, the
 * direction's all, and those of the projects they own. Tabs by state.
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

  const shown = view
    ? all.filter((contract) => inContractView(contract.state, view))
    : all;

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
              href: routes.contracts,
              label: t.views.all,
              count: all.length,
              current: view === null,
            },
            ...CONTRACT_VIEW_KEYS.map((key) => ({
              href: viewHref(routes.contracts, { view: key }),
              label: t.views[key],
              count: all.filter((c) => inContractView(c.state, key)).length,
              current: view === key,
            })),
          ]}
        >
          {shown.length > 0 ? (
            // Remounted per tab: the search starts empty on each one.
            <ContractsList key={view ?? "all"} contracts={shown} />
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

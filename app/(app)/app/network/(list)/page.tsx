import { IconBoxArchive, IconNodes } from "nucleo-sharp-essential";

import { LiveViewLink } from "@/components/archive/live-view-link";
import { FormMessage } from "@/components/auth/form-message";
import { UrlFilters, type UrlFilterGroup } from "@/components/ui/url-filters";
import { NetworkList } from "@/components/network/network-list";
import { NewContactButton } from "@/components/network/new-contact-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { DataTableViews } from "@/components/ui/data-table";
import { archiveFilterGroup } from "@/lib/archive/filter";
import { isArchivedView } from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadContactProjectTitles } from "@/lib/network/contact-projects";
import { listNetworkContacts } from "@/lib/network/queries";
import {
  asNetworkDomain,
  asNetworkRelation,
  asNetworkView,
  inDomain,
  inView,
  NETWORK_DOMAIN_KEYS,
  NETWORK_RELATIONS,
  NETWORK_VIEWS,
  type NetworkContactRow,
} from "@/lib/network/types";
import { viewHref } from "@/lib/ui/view-href";
import { normalizeSearch } from "@/lib/utils/search";

export const metadata = { title: `${fr.network.title} · ${fr.app.name}` };

/**
 * The network (MVP "Réseau simple"): every person and organization PDS works
 * with, shared by the whole team. Tabs by kind and the spotted artists, then
 * « Filtres » by métier, relation type and city (tickets « Retour PO /
 * Réseau » of 10 and 11/10/2026); the director also sees the archive.
 */
export default async function NetworkPage({
  searchParams,
}: PageProps<"/app/network">) {
  const access = await requireApproved();
  const t = fr.network;
  const params = await searchParams;
  const canArchive = can(access, "archive_records");
  const archived = canArchive && isArchivedView(params.view);
  const tab = asNetworkView(params.tab);
  const domain = asNetworkDomain(params.domain);
  const relation = asNetworkRelation(params.relation);
  const city = typeof params.city === "string" ? params.city : null;
  const [all, projectsOf] = await Promise.all([
    listNetworkContacts(archived),
    loadContactProjectTitles(),
  ]);
  const projects = Object.fromEntries(
    [...projectsOf].map(([id, list]) => [id, list.map((p) => p.title)]),
  );
  const canWrite = can(access, "manage_network") && !archived;
  const newButton = canWrite ? <NewContactButton /> : null;

  if (!all)
    return (
      <PageContainer>
        <PageHeader title={t.title} description={t.description} />
        <FormMessage kind="error">{t.loadError}</FormMessage>
      </PageContainer>
    );

  const filtered = all.filter(
    (c) =>
      (!domain || inDomain(c.roles, domain)) &&
      (!relation || c.relations.includes(relation)) &&
      (!city || (c.city && normalizeSearch(c.city) === normalizeSearch(city))),
  );
  const contacts = tab ? filtered.filter((c) => inView(c, tab)) : filtered;
  const view = archived ? "archived" : null;
  const filters = { domain, relation, city };
  const filtering = domain !== null || relation !== null || city !== null;
  const ofTab = tab ? all.filter((c) => inView(c, tab)) : all;
  // No row: the archive, the filters, the tab or the network is empty.
  const empty = archived ? (
    <EmptyState
      icon={IconBoxArchive}
      title={fr.records.archivedEmpty.contact}
      body={fr.records.archivedEmptyBody}
      action={
        <LiveViewLink href={viewHref(routes.network, { tab, ...filters })} />
      }
    />
  ) : filtering ? (
    <EmptyState
      icon={IconNodes}
      title={t.emptyFilterTitle}
      body={t.emptyFilterBody}
    />
  ) : tab ? (
    <EmptyState
      icon={IconNodes}
      title={t.emptyViewTitle(t.views[tab])}
      body={t.emptyViewBody}
    />
  ) : (
    <EmptyState
      icon={IconNodes}
      title={t.emptyTitle}
      body={t.emptyBody}
      action={newButton}
    />
  );

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.description}
        action={all.length > 0 ? newButton : null}
      />
      {all.length === 0 && !archived && !canArchive ? (
        <EmptyState
          icon={IconNodes}
          title={t.emptyTitle}
          body={t.emptyBody}
          action={newButton}
        />
      ) : (
        <DataTableViews
          label={t.viewsLabel}
          views={[
            {
              href: viewHref(routes.network, { view, ...filters }),
              label: t.views.all,
              count: filtered.length,
              current: tab === null,
            },
            ...NETWORK_VIEWS.map((key) => ({
              href: viewHref(routes.network, { tab: key, view, ...filters }),
              label: t.views[key],
              count: filtered.filter((c) => inView(c, key)).length,
              current: tab === key,
            })),
          ]}
        >
          {all.length === 0 ? (
            empty
          ) : (
            <NetworkList
              contacts={contacts}
              projects={projects}
              rights={{
                canEdit: can(access, "manage_network"),
                canArchive,
                archived,
              }}
              filters={
                <UrlFilters
                  path={routes.network}
                  params={{ tab }}
                  groups={[
                    ...filterGroups(ofTab, filters),
                    ...(canArchive ? [archiveFilterGroup(archived)] : []),
                  ]}
                />
              }
              empty={empty}
            />
          )}
        </DataTableViews>
      )}
    </PageContainer>
  );
}

// The filters' choices: only what some contact of the tab holds, in the
// lists' order; cities by their first spelling, case and accents aside.
function filterGroups(
  contacts: NetworkContactRow[],
  current: {
    domain: string | null;
    relation: string | null;
    city: string | null;
  },
): UrlFilterGroup[] {
  const t = fr.network;
  const cities = new Map<string, string>();
  for (const c of contacts)
    if (c.city && !cities.has(normalizeSearch(c.city)))
      cities.set(normalizeSearch(c.city), c.city);
  return [
    {
      key: "domain",
      label: t.filters.domainLabel,
      allLabel: t.filters.domainAll,
      options: NETWORK_DOMAIN_KEYS.filter((key) =>
        contacts.some((c) => inDomain(c.roles, key)),
      ).map((key) => ({ value: key, label: t.filters.domains[key] })),
      current: current.domain,
    },
    {
      key: "relation",
      label: t.filters.relationLabel,
      allLabel: t.filters.relationAll,
      options: NETWORK_RELATIONS.filter((key) =>
        contacts.some((c) => c.relations.includes(key)),
      ).map((key) => ({ value: key, label: t.relationsPlural[key] })),
      current: current.relation,
    },
    {
      key: "city",
      label: t.filters.cityLabel,
      allLabel: t.filters.cityAll,
      options: [...cities.values()]
        .sort((a, b) => a.localeCompare(b, "fr"))
        .map((value) => ({ value, label: value })),
      current: current.city,
    },
  ];
}

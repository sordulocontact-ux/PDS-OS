import { IconBoxArchive, IconNodes } from "nucleo-sharp-essential";

import { ArchiveViewToggle } from "@/components/archive/archive-view-toggle";
import { FormMessage } from "@/components/auth/form-message";
import { NetworkList } from "@/components/network/network-list";
import { NewContactButton } from "@/components/network/new-contact-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { DataTableViews } from "@/components/ui/data-table";
import { isArchivedView } from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listNetworkContacts } from "@/lib/network/queries";
import {
  asNetworkFamily,
  inFamily,
  NETWORK_FAMILY_KEYS,
} from "@/lib/network/types";
import { viewHref } from "@/lib/ui/view-href";

export const metadata = { title: `${fr.network.title} · ${fr.app.name}` };

/**
 * The network (MVP "Réseau simple"): every person and organization PDS works
 * with, shared by the whole team. Tabs by role family; the director also
 * sees the archive.
 */
export default async function NetworkPage({
  searchParams,
}: PageProps<"/app/network">) {
  const access = await requireApproved();
  const t = fr.network;
  const params = await searchParams;
  const canArchive = can(access, "archive_records");
  const archived = canArchive && isArchivedView(params.view);
  const family = asNetworkFamily(params.family);
  const all = await listNetworkContacts(archived);
  const canWrite = can(access, "manage_network") && !archived;
  const newButton = canWrite ? <NewContactButton /> : null;

  if (!all)
    return (
      <PageContainer>
        <PageHeader title={t.title} description={t.description} />
        <FormMessage kind="error">{t.loadError}</FormMessage>
      </PageContainer>
    );

  const contacts = family
    ? all.filter((contact) => inFamily(contact.roles, family))
    : all;
  const view = archived ? "archived" : null;

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
              href: viewHref(routes.network, { view }),
              label: t.views.all,
              count: all.length,
              current: family === null,
            },
            ...NETWORK_FAMILY_KEYS.map((key) => ({
              href: viewHref(routes.network, { family: key, view }),
              label: t.views[key],
              count: all.filter((c) => inFamily(c.roles, key)).length,
              current: family === key,
            })),
          ]}
          action={
            canArchive && (
              <ArchiveViewToggle
                path={routes.network}
                archived={archived}
                params={family ? { family } : undefined}
              />
            )
          }
        >
          {contacts.length > 0 ? (
            // Remounted per tab: the search starts empty on each one.
            <NetworkList
              key={`${family}-${view}`}
              contacts={contacts}
              rights={{
                canEdit: can(access, "manage_network"),
                canArchive,
                archived,
              }}
            />
          ) : archived ? (
            <EmptyState
              icon={IconBoxArchive}
              title={fr.records.archivedEmpty.contact}
              body={fr.records.archivedEmptyBody}
            />
          ) : family ? (
            <EmptyState
              icon={IconNodes}
              title={t.emptyViewTitle(t.views[family])}
              body={t.emptyViewBody}
            />
          ) : (
            <EmptyState
              icon={IconNodes}
              title={t.emptyTitle}
              body={t.emptyBody}
              action={newButton}
            />
          )}
        </DataTableViews>
      )}
    </PageContainer>
  );
}

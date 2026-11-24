import { IconUnorderedList } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { NetworkListsTable } from "@/components/network/lists/network-lists-table";
import { NewListButton } from "@/components/network/lists/new-list-button";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { DataTableViews } from "@/components/ui/data-table";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listNetworkLists } from "@/lib/network/lists";
import {
  asNetworkListView,
  NETWORK_LIST_VIEWS,
  networkListRoutes,
  type NetworkListItem,
  type NetworkListView,
} from "@/lib/network/lists-types";
import { viewHref } from "@/lib/ui/view-href";

export const metadata = {
  title: `${fr.network.lists.title} · ${fr.app.name}`,
};

const inView = (list: NetworkListItem, view: NetworkListView) =>
  view === "mine" ? list.state === "private" : list.state !== "private";

/**
 * « Mes listes » of the Réseau (Ibé, 18/11/2026): the viewer's own lists
 * and those shared with the team (RLS), all of them, « Pour moi » or
 * « Partagées ». Made here (« Nouvelle liste ») or from the Réseau's
 * selection (« Ajouter à une liste »), by who manages the Réseau.
 */
export default async function NetworkListsPage({
  searchParams,
}: PageProps<"/app/network/lists">) {
  const access = await requireApproved();
  const t = fr.network.lists;
  const view = asNetworkListView((await searchParams).view);
  const { lists, error } = await listNetworkLists();
  const shown = view ? lists.filter((l) => inView(l, view)) : lists;
  const newButton = can(access, "manage_network") ? <NewListButton /> : null;
  const empty = t.empty[view ?? "all"];

  return (
    <SectionFrame
      title={t.title}
      list={false}
      parent={{ label: fr.shell.nav.network, href: routes.network }}
      action={shown.length > 0 ? newButton : null}
    >
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : (
        <DataTableViews
          label={t.views.label}
          views={
            lists.length > 0
              ? [
                  {
                    href: networkListRoutes.lists,
                    label: t.views.all,
                    count: lists.length,
                    current: view === null,
                  },
                  ...NETWORK_LIST_VIEWS.map((key) => ({
                    href: viewHref(networkListRoutes.lists, { view: key }),
                    label: t.views[key],
                    count: lists.filter((l) => inView(l, key)).length,
                    current: view === key,
                  })),
                ]
              : []
          }
        >
          {shown.length === 0 ? (
            <EmptyState
              icon={IconUnorderedList}
              title={empty.title}
              body={empty.body}
              action={newButton}
            />
          ) : (
            <NetworkListsTable lists={shown} viewerPersonId={access.personId} />
          )}
        </DataTableViews>
      )}
    </SectionFrame>
  );
}

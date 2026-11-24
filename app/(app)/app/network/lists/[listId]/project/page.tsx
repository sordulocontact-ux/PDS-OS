import { redirect } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import {
  CreateProjectForm,
  type ProjectFormDefaults,
} from "@/components/projects/create-project-form";
import { SectionFrame } from "@/components/shell/section-frame";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listArtistOptions, listMasterOptions } from "@/lib/catalog/queries";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { getNetworkList } from "@/lib/network/lists";
import { networkListRoutes } from "@/lib/network/lists-types";
import { listNetworkContacts } from "@/lib/network/queries";
import { loadCollectiveContext } from "@/lib/projects/collective-context";
import { listContentFormats } from "@/lib/projects/content-formats";
import { listCreativePeople } from "@/lib/projects/creatives";
import { listAssignablePeople } from "@/lib/projects/queries";

export const metadata = {
  title: `${fr.shell.newProject.title} · ${fr.app.name}`,
};

/**
 * « Créer un projet » from a list of the Réseau (Ibé, 18/11/2026: « une
 * fois que la liste est conservée, tu peux ensuite créer un projet à partir
 * de cette liste »): the real project form, pre-filled (CLAUDE.md « ne
 * jamais faire retaper »), everything still editable. The people of the
 * list who are artists of the Catalogue (`artist_id`) are its artists:
 * several make a collective on the PDS Mic model (house artist as main
 * artist, the others as guests: create_collective_project), one is the
 * project's artist. The others are said above the form, never dropped
 * silently. For who creates projects only.
 */
export default async function NetworkListProjectPage({
  params,
}: PageProps<"/app/network/lists/[listId]/project">) {
  const { listId } = await params;
  const access = await requireApproved();
  if (!can(access, "create_projects")) redirect(networkListRoutes.list(listId));
  const organizationId = access.organizationId ?? "";
  const [list, network, masters, artists, contentFormats, managers, creatives] =
    await Promise.all([
      getNetworkList(listId),
      listNetworkContacts(false),
      listMasterOptions(),
      listArtistOptions(),
      listContentFormats(),
      listAssignablePeople(organizationId),
      listCreativePeople(organizationId),
    ]);
  if (!list) redirect(networkListRoutes.lists);
  const collective = await loadCollectiveContext(
    access,
    artists,
    contentFormats,
  );
  const t = fr.network.lists;

  // The list's people, by name: artists of the Catalogue, and the others.
  const inList = new Set(list.members.map((m) => m.contactId));
  const people = (network ?? [])
    .filter((c) => inList.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const live = new Set(artists.map((a) => a.id));
  const artistIds = [
    ...new Set(
      people.flatMap((c) =>
        c.artistId && live.has(c.artistId) ? [c.artistId] : [],
      ),
    ),
  ];
  const outside = people
    .filter((c) => !c.artistId || !live.has(c.artistId))
    .map((c) => c.name);
  const main = collective?.houseArtistId ?? null;
  const defaults: ProjectFormDefaults =
    artistIds.length > 1
      ? {
          title: list.name,
          type: "content",
          contentMode: collective?.modelFormatId ? "format" : null,
          contentFormatId: collective?.modelFormatId ?? null,
          collective: true,
          mainArtistId: main,
          guestArtistIds: artistIds.filter((id) => id !== main),
          masterIds: [],
        }
      : {
          title: list.name,
          type: null,
          artistId: artistIds[0] ?? null,
          masterIds: [],
        };

  return (
    <SectionFrame
      list={false}
      className="max-w-2xl"
      title={fr.shell.newProject.title}
      description={t.project.subtitle(list.name)}
      parent={[
        { label: fr.shell.nav.network, href: routes.network },
        { label: t.title, href: networkListRoutes.lists },
        { label: list.name, href: networkListRoutes.list(list.id) },
      ]}
    >
      {outside.length > 0 && (
        <FormMessage kind="info">{t.project.notInCatalog(outside)}</FormMessage>
      )}
      <CreateProjectForm
        masters={masters}
        artists={artists}
        contentFormats={contentFormats}
        managers={managers}
        creatives={creatives}
        organizationId={access.organizationId ?? undefined}
        collectiveContext={collective}
        cancelHref={networkListRoutes.list(list.id)}
        defaults={defaults}
      />
    </SectionFrame>
  );
}

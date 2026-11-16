import { IconMicrophone } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import {
  AddArtistsButton,
  SelectionActions,
} from "@/components/catalog/selections/selection-actions";
import { SelectionArtistsTable } from "@/components/catalog/selections/selection-artists-table";
import { BackLink } from "@/components/shell/back-link";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listArtistOptions } from "@/lib/catalog/queries";
import {
  getSelection,
  listSelectionRecipients,
  type SelectionDetail,
} from "@/lib/catalog/selections";
import { fr } from "@/lib/i18n/fr";
import { canConvertSelection } from "@/lib/projects/collective-rules";
import { allInOrder } from "@/lib/utils/parallel";
import { formatShortDay } from "@/lib/utils/day";

export async function generateMetadata({
  params,
}: PageProps<"/app/catalog/artists/selections/[selectionId]">) {
  const { selectionId } = await params;
  const selection = await getSelection(selectionId);
  return {
    title: `${selection?.name ?? fr.artistSelections.title} · ${fr.app.name}`,
  };
}

/**
 * A selection of artists (lot 4 of docs/pds-mic-plan.md): its name, who
 * holds it and how it came to them, its artists in order. Read by the whole
 * team; who manages the Catalogue adds and removes artists, hands it over,
 * renames it. « Créer le projet » (lot 5) opens the project form on it, for
 * the direction and for its holder, once it has artists.
 */
export default async function ArtistSelectionPage({
  params,
}: PageProps<"/app/catalog/artists/selections/[selectionId]">) {
  const { selectionId } = await params;
  const [access, selection] = await allInOrder([
    requireApproved(),
    getSelection(selectionId),
  ]);
  if (!selection) notFound();
  const t = fr.artistSelections;
  const canManage = can(access, "manage_catalog");
  const [artists, recipients] = await Promise.all([
    canManage ? listArtistOptions() : Promise.resolve([]),
    canManage && access.organizationId
      ? listSelectionRecipients(access.organizationId)
      : Promise.resolve([]),
  ]);
  const inSelection = selection.artists.map((a) => a.id);
  const empty = selection.artists.length === 0;
  const createProjectHref =
    !empty && canConvertSelection(access, selection.holder.personId)
      ? routes.projectsNewFromSelection(selection.id)
      : null;

  return (
    <SectionFrame
      list={false}
      className="max-w-5xl"
      above={<BackLink href={routes.artistSelections}>{t.back}</BackLink>}
      title={selection.name}
      description={describe(selection, access.personId)}
      action={
        canManage ? (
          <SelectionActions
            selectionId={selection.id}
            name={selection.name}
            holderPersonId={selection.holder.personId}
            artists={artists}
            inSelection={inSelection}
            recipients={recipients}
            emptySelection={empty}
            createProjectHref={createProjectHref}
          />
        ) : null
      }
    >
      {empty ? (
        <EmptyState
          icon={IconMicrophone}
          title={t.emptyArtists.title}
          body={canManage ? t.emptyArtists.body : t.emptyArtists.readOnly}
          action={
            canManage ? (
              <AddArtistsButton
                selectionId={selection.id}
                artists={artists}
                inSelection={inSelection}
              />
            ) : null
          }
        />
      ) : (
        <SelectionArtistsTable
          selectionId={selection.id}
          artists={selection.artists}
          canManage={canManage}
        />
      )}
    </SectionFrame>
  );
}

/** « 3 artistes · Responsable : Alizé Martin · transmise par Maël Auzenet
 * le 11/11 » (« créée par … » when it never changed hands; « vous » for the
 * viewer). */
function describe(selection: SelectionDetail, viewerPersonId: string | null) {
  const t = fr.artistSelections;
  const who = (person: { personId: string; name: string } | null) =>
    !person
      ? t.someone
      : person.personId === viewerPersonId
        ? t.youInline
        : person.name;
  const origin = selection.transmittedAt
    ? t.transmitted(
        who(selection.transmittedBy),
        formatShortDay(selection.transmittedAt, { bare: true }),
      )
    : t.created(
        who(selection.createdBy),
        formatShortDay(selection.createdAt, { bare: true }),
      );
  return `${t.artistCount(selection.artists.length)} · ${t.holder(who(selection.holder))} · ${origin}`;
}

import { IconBoxArchive, IconMicrophone } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { ArtistListViews } from "@/components/catalog/artist-list-views";
import { ArtistsTable } from "@/components/catalog/artists-table";
import { NewArtistButton } from "@/components/catalog/new-artist-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { isArchivedView } from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listArtists } from "@/lib/catalog/queries";
import { isArtistRelation } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

export default async function ArtistsPage({
  searchParams,
}: PageProps<"/app/catalog/artists">) {
  const access = await requireApproved();
  const t = fr.catalog.artists;
  const canArchive = can(access, "archive_records");
  const params = await searchParams;
  // The archive is the director's: anyone else always sees live artists.
  const archived = canArchive && isArchivedView(params.view);
  // No filter = every artist ("Tous").
  const relation = isArtistRelation(params.relation) ? params.relation : null;
  // One read for the tab counts and the rows: the roster stays small.
  const { artists: all, error } = await listArtists({ archived });
  const counts = {
    all: all.length,
    signed: all.filter((a) => a.relation === "signed").length,
    collaboration: all.filter((a) => a.relation === "collaboration").length,
  };
  const artists = relation ? all.filter((a) => a.relation === relation) : all;
  const canCreate = can(access, "manage_catalog") && !archived;

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.subtitle}
        action={canCreate && artists.length > 0 ? <NewArtistButton /> : null}
      />
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : (
        <ArtistListViews
          relation={relation}
          counts={counts}
          archived={archived}
          canArchive={canArchive}
        >
          {artists.length === 0 ? (
            archived ? (
              <EmptyState
                icon={IconBoxArchive}
                title={fr.records.archivedEmpty.artist}
                body={fr.records.archivedEmptyBody}
              />
            ) : relation ? (
              <EmptyState
                icon={IconMicrophone}
                title={t.filteredEmpty[relation]}
                body={t.filteredEmptyBody}
                action={canCreate ? <NewArtistButton /> : null}
              />
            ) : (
              <EmptyState
                icon={IconMicrophone}
                title={t.emptyTitle}
                body={canCreate ? t.emptyBody : t.emptyBodyReadOnly}
                action={canCreate ? <NewArtistButton /> : null}
              />
            )
          ) : (
            <ArtistsTable
              artists={artists}
              // Within a relation filter, it goes without saying.
              showRelation={relation === null}
              rights={{
                canEdit: can(access, "manage_catalog"),
                canArchive,
                archived,
              }}
            />
          )}
        </ArtistListViews>
      )}
    </PageContainer>
  );
}

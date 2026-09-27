import { IconBoxArchive, IconMicrophone } from "nucleo-sharp-essential";

import { ArchiveViewToggle } from "@/components/archive/archive-view-toggle";
import { FormMessage } from "@/components/auth/form-message";
import { ArtistsTable } from "@/components/catalog/artists-table";
import { NewArtistButton } from "@/components/catalog/new-artist-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { isArchivedView } from "@/lib/archive/types";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listArtists } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";

export default async function ArtistsPage({
  searchParams,
}: PageProps<"/app/catalog/artists">) {
  const access = await requireApproved();
  const t = fr.catalog.artists;
  const canArchive = can(access, "archive_records");
  // The archive is the director's: anyone else always sees live artists.
  const archived = canArchive && isArchivedView((await searchParams).view);
  const { artists, error } = await listArtists({ archived });
  const canCreate = can(access, "manage_catalog") && !archived;

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.subtitle}
        action={canCreate && artists.length > 0 ? <NewArtistButton /> : null}
      />
      {canArchive && (
        <ArchiveViewToggle path={routes.artists} archived={archived} />
      )}
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : artists.length === 0 ? (
        archived ? (
          <EmptyState
            icon={IconBoxArchive}
            title={fr.records.archivedEmpty.artist}
            body={fr.records.archivedEmptyBody}
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
          rights={{
            canEdit: can(access, "manage_catalog"),
            canArchive,
            archived,
          }}
        />
      )}
    </PageContainer>
  );
}

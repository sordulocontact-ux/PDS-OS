import { IconMicrophone } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { ArtistsTable } from "@/components/catalog/artists-table";
import { NewArtistButton } from "@/components/catalog/new-artist-button";
import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listArtists } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";

export default async function ArtistsPage() {
  const access = await requireApproved();
  const t = fr.catalog.artists;
  const { artists, error } = await listArtists();
  const canCreate = can(access, "manage_catalog");

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.subtitle}
        action={canCreate && artists.length > 0 ? <NewArtistButton /> : null}
      />
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : artists.length === 0 ? (
        <EmptyState
          icon={IconMicrophone}
          title={t.emptyTitle}
          body={canCreate ? t.emptyBody : t.emptyBodyReadOnly}
          action={canCreate ? <NewArtistButton /> : null}
        />
      ) : (
        <ArtistsTable artists={artists} />
      )}
    </PageContainer>
  );
}

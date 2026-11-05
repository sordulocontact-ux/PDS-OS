import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { FileLibrary } from "@/components/catalog/files/file-library";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/artist-queries";
import { fileViewOf } from "@/lib/catalog/file-rules";
import { listCatalogFiles } from "@/lib/catalog/files";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.catalog.artistPage.tabs.files };

// Files tab: the artist's document library, filtered by category in the
// URL (?category=). Everyone reads it (contracts only with manage_catalog,
// RLS); manage_catalog adds, edits, reclassifies and deletes.
export default async function ArtistFilesPage({
  params,
  searchParams,
}: PageProps<"/app/catalog/artists/[artistId]/files">) {
  const { artistId } = await params;
  const owner = { kind: "artist", id: artistId } as const;
  const [access, artist, { files, error }, query] = await allInOrder([
    requireApproved(),
    getArtist(artistId),
    listCatalogFiles(owner),
    searchParams,
  ]);
  if (!artist) notFound();
  const canEdit = can(access, "manage_catalog");
  const t = fr.catalogFiles;

  if (error) return <FormMessage kind="error">{t.loadError}</FormMessage>;
  return (
    <FileLibrary
      owner={owner}
      organizationId={canEdit ? artist.organizationId : null}
      canReadContracts={canEdit}
      files={files}
      view={fileViewOf("artist", canEdit, query.category)}
      basePath={routes.artistFiles(artist.id)}
      emptyBody={t.emptyBody}
      emptyBodyReadOnly={t.emptyBodyReadOnly}
    />
  );
}

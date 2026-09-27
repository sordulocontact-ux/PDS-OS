import { IconFile } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { FileUpload } from "@/components/catalog/files/file-upload";
import { FilesTable } from "@/components/catalog/files/files-table";
import { EmptyState } from "@/components/shell/empty-state";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { getArtist } from "@/lib/catalog/artist-queries";
import { listCatalogFiles } from "@/lib/catalog/files";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Files tab: documents of the artist. Everyone reads them (contracts only
// with manage_catalog, RLS); manage_catalog adds and deletes.
export default async function ArtistFilesPage({
  params,
}: PageProps<"/app/catalog/artists/[artistId]/files">) {
  const { artistId } = await params;
  const [access, artist, { files, error }] = await allInOrder([
    requireApproved(),
    getArtist(artistId),
    listCatalogFiles({ kind: "artist", id: artistId }),
  ]);
  if (!artist) notFound();
  const canEdit = can(access, "manage_catalog");
  const t = fr.catalogFiles;
  const owner = { kind: "artist", id: artist.id } as const;

  return (
    <div className="flex flex-col gap-6">
      {canEdit && (
        <FileUpload organizationId={artist.organizationId} owner={owner} />
      )}
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : files.length === 0 ? (
        <EmptyState
          icon={IconFile}
          title={t.emptyTitle}
          body={canEdit ? t.emptyBody : t.emptyBodyReadOnly}
        />
      ) : (
        <FilesTable owner={owner} files={files} canDelete={canEdit} />
      )}
    </div>
  );
}

import { IconFile } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { FileUpload } from "@/components/catalog/artist-page/files/file-upload";
import { FilesTable } from "@/components/catalog/artist-page/files/files-table";
import { EmptyState } from "@/components/shell/empty-state";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { getArtist } from "@/lib/catalog/artist-queries";
import { listArtistFiles } from "@/lib/catalog/files";
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
    listArtistFiles(artistId),
  ]);
  if (!artist) notFound();
  const canEdit = can(access, "manage_catalog");
  const t = fr.artistFiles;

  return (
    <div className="flex flex-col gap-6">
      {canEdit && (
        <FileUpload
          organizationId={artist.organizationId}
          artistId={artist.id}
        />
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
        <FilesTable artistId={artist.id} files={files} canDelete={canEdit} />
      )}
    </div>
  );
}

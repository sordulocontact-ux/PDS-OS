import { IconFile } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { FileUpload } from "@/components/catalog/files/file-upload";
import { FilesTable } from "@/components/catalog/files/files-table";
import { EmptyState } from "@/components/shell/empty-state";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listCatalogFiles } from "@/lib/catalog/files";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Files tab: master final, stems, mixes, artwork, contracts. Everyone reads
// them (contracts only with manage_catalog, RLS); manage_catalog adds and
// deletes. Same components as the artist files.
export default async function MasterFilesPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/files">) {
  const { masterId } = await params;
  const owner = { kind: "master", id: masterId } as const;
  const [access, master, { files, error }] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listCatalogFiles(owner),
  ]);
  if (!master) notFound();
  const canEdit = can(access, "manage_catalog") && !!access.organizationId;
  const t = fr.catalogFiles;
  const m = fr.masterPage.files;

  return (
    <div className="flex flex-col gap-6">
      {canEdit && access.organizationId && (
        <FileUpload organizationId={access.organizationId} owner={owner} />
      )}
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : files.length === 0 ? (
        <EmptyState
          icon={IconFile}
          title={t.emptyTitle}
          body={canEdit ? m.emptyBody : m.emptyBodyReadOnly}
        />
      ) : (
        <FilesTable owner={owner} files={files} canDelete={canEdit} />
      )}
    </div>
  );
}

import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { FileLibrary } from "@/components/catalog/files/file-library";
import { sectionCardClass } from "@/components/ui/section-card";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fileViewOf } from "@/lib/catalog/file-rules";
import { listCatalogFiles } from "@/lib/catalog/files";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { allInOrder } from "@/lib/utils/parallel";

// Files tab: stems, artwork, contracts… everything but the audio versions,
// which have their own tab. The same library as the artist's (views by
// category, ?category=). Everyone reads it (contracts only with
// manage_catalog, RLS); manage_catalog adds, edits and deletes.
export default async function MasterFilesPage({
  params,
  searchParams,
}: PageProps<"/app/catalog/masters/[masterId]/files">) {
  const { masterId } = await params;
  const owner = { kind: "master", id: masterId } as const;
  const [access, master, { files, error }, query] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
    listCatalogFiles(owner, "other"),
    searchParams,
  ]);
  if (!master) notFound();
  const canReadContracts = can(access, "manage_catalog");
  const m = fr.masterPage.files;

  if (error)
    return <FormMessage kind="error">{fr.catalogFiles.loadError}</FormMessage>;
  // On a white card, like every block of the title page.
  return (
    <div className={sectionCardClass}>
      <FileLibrary
        owner={owner}
        organizationId={canReadContracts ? access.organizationId : null}
        canReadContracts={canReadContracts}
        files={files}
        view={fileViewOf("master", canReadContracts, query.category)}
        basePath={routes.masterFiles(masterId)}
        emptyBody={m.emptyBody}
        emptyBodyReadOnly={m.emptyBodyReadOnly}
      />
    </div>
  );
}

import { FormMessage } from "@/components/auth/form-message";
import { FileLibrary } from "@/components/catalog/files/file-library";
import { DesignFilesTable } from "@/components/project-history/design-files-table";
import { FilesTable } from "@/components/project-history/files-table";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fileViewOf } from "@/lib/catalog/file-rules";
import { listCatalogFiles } from "@/lib/catalog/files";
import { listDesignFiles } from "@/lib/design/versions";
import { fr } from "@/lib/i18n/fr";
import { listProjectFiles } from "@/lib/project-history/queries";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.projectHistory.files;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

// The project's documents: the same library as an artist's (views by
// category, ?category=), written by the owner alone, read by whoever sees
// the project (contracts: owner and direction, RLS). Below, what other
// steps stored: versions deposited in the Conception, call recordings.
export default async function ProjectFilesPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/files">) {
  const { projectId } = await params;
  const owner = { kind: "project", id: projectId } as const;
  const [access, project, library, callFiles, designFiles, query] =
    await allInOrder([
      requireApproved(),
      requireLaunchedProject(projectId),
      listCatalogFiles(owner),
      listProjectFiles(projectId),
      createClient().then((supabase) => listDesignFiles(supabase, projectId)),
      searchParams,
    ]);
  const canEdit = canEditProject(access, project);
  const canReadContracts = canEdit || can(access, "view_all_projects");

  return (
    <div className="grid gap-6">
      <PageSection id="documents" title={t.libraryTitle}>
        {library.error ? (
          <FormMessage kind="error">{fr.catalogFiles.loadError}</FormMessage>
        ) : (
          <FileLibrary
            owner={owner}
            organizationId={canEdit ? access.organizationId : null}
            canReadContracts={canReadContracts}
            files={library.files}
            view={fileViewOf("project", canReadContracts, query.category)}
            basePath={routes.projectFiles(projectId)}
            emptyBody={t.libraryEmptyBody}
            emptyBodyReadOnly={t.libraryEmptyBodyReadOnly}
          />
        )}
      </PageSection>
      {designFiles.length > 0 && (
        <PageSection id="design-files" title={t.designTitle}>
          <DesignFilesTable projectId={projectId} files={designFiles} />
        </PageSection>
      )}
      {callFiles.length > 0 && (
        <PageSection id="call-files" title={t.callsTitle}>
          <FilesTable projectId={projectId} files={callFiles} />
        </PageSection>
      )}
    </div>
  );
}

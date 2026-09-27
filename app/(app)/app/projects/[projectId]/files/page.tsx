import { IconFolderOpen } from "nucleo-sharp-essential";

import { DesignFilesTable } from "@/components/project-history/design-files-table";
import { FilesTable } from "@/components/project-history/files-table";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { requireApproved } from "@/lib/auth/dal";
import { listDesignFiles } from "@/lib/design/versions";
import { fr } from "@/lib/i18n/fr";
import { listProjectFiles } from "@/lib/project-history/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.projectHistory.files;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

// What is stored for the project: the call recordings and the versions
// deposited in the Conception. Contractor deposits come later.
export default async function ProjectFilesPage({
  params,
}: PageProps<"/app/projects/[projectId]/files">) {
  const { projectId } = await params;
  const [, , files, designFiles] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    listProjectFiles(projectId),
    createClient().then((supabase) => listDesignFiles(supabase, projectId)),
  ]);

  return (
    <div className="grid gap-6">
      <ProjectPageHeader title={t.title} description={t.description} />
      {files.length === 0 && designFiles.length === 0 ? (
        <EmptyState
          icon={IconFolderOpen}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <>
          {designFiles.length > 0 && (
            <PageSection id="design-files" title={t.designTitle}>
              <DesignFilesTable projectId={projectId} files={designFiles} />
            </PageSection>
          )}
          {files.length > 0 && (
            <PageSection id="call-files" title={t.callsTitle}>
              <FilesTable projectId={projectId} files={files} />
            </PageSection>
          )}
        </>
      )}
    </div>
  );
}

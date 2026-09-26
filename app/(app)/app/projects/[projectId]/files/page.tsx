import { IconFolderOpen } from "nucleo-sharp-essential";

import { FilesTable } from "@/components/project-history/files-table";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { listProjectFiles } from "@/lib/project-history/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";

const t = fr.projectHistory.files;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

// What is stored for the project today: the call recordings. File deposit
// (deliverable versions, contractors) comes later.
export default async function ProjectFilesPage({
  params,
}: PageProps<"/app/projects/[projectId]/files">) {
  await requireApproved();
  const { projectId } = await params;
  await requireLaunchedProject(projectId);
  const files = await listProjectFiles(projectId);

  return (
    <div className="grid gap-6">
      <ProjectPageHeader title={t.title} description={t.description} />
      {files.length === 0 ? (
        <EmptyState
          icon={IconFolderOpen}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <FilesTable projectId={projectId} files={files} />
      )}
    </div>
  );
}

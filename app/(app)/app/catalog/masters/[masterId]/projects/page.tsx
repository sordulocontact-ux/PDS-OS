import { IconFolderOpen } from "nucleo-sharp-essential";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { ProjectsTable } from "@/components/projects/projects-table";
import { EmptyState } from "@/components/shell/empty-state";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { listProjects } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

// Projects tab: live projects carrying the master, among those the viewer
// may see (RLS), in the same table as the Projects page.
export default async function MasterProjectsPage({
  params,
}: PageProps<"/app/catalog/masters/[masterId]/projects">) {
  const { masterId } = await params;
  const [access, master] = await allInOrder([
    requireApproved(),
    getMaster(masterId),
  ]);
  if (!master) notFound();
  const { projects, error } = await listProjects({
    ids: master.projects.map((p) => p.id),
  });
  const t = fr.masterPage.projects;

  if (error)
    return <FormMessage kind="error">{fr.masterPage.loadError}</FormMessage>;
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={IconFolderOpen}
        title={t.emptyTitle}
        body={t.emptyBody}
      />
    );
  }
  return (
    <ProjectsTable
      projects={projects}
      rights={{
        canEdit: can(access, "create_projects"),
        canArchive: can(access, "archive_records"),
        archived: false,
      }}
    />
  );
}

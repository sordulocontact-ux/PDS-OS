import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const title = fr.shell.project.sidebar.master;

export const metadata = { title: `${title} · ${fr.app.name}` };

// Master workflow of the project's titles: an empty page for now.
export default async function ProjectMasterPage({
  params,
}: PageProps<"/app/projects/[projectId]/master">) {
  const { projectId } = await params;
  await allInOrder([requireApproved(), requireLaunchedProject(projectId)]);

  return <ProjectPageHeader title={title} />;
}

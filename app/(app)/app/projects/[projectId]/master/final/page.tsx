import { FinalPage } from "@/components/master-workflow/final-page";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadFinalView } from "@/lib/master-workflow/final";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.masterWorkflow.final.title} · ${fr.app.name}`,
};

// Master, last step: each title's validated Master final, its place in the
// Catalogue and the other deliverables of the brief.
export default async function ProjectMasterFinalPage({
  params,
}: PageProps<"/app/projects/[projectId]/master/final">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);

  const view = await loadFinalView(project, access);
  return <FinalPage view={view} />;
}

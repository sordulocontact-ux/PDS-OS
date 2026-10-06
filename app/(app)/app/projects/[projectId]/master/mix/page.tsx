import { MixPage } from "@/components/master-workflow/mix-page";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadMixVersions } from "@/lib/master-workflow/mix-versions";
import { loadStepView } from "@/lib/master-workflow/transmission";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.masterWorkflow.mix.title} · ${fr.app.name}`,
};

// Master, Mix step: the package sent to the mix engineer and its follow-up.
// Read by whoever sees the project, sent by its owner
// (create_master_transmission).
export default async function ProjectMasterMixPage({
  params,
}: PageProps<"/app/projects/[projectId]/master/mix">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);

  const [view, versions] = await Promise.all([
    loadStepView(project, access, "mix"),
    loadMixVersions(project, access.personId, "mix"),
  ]);
  return <MixPage view={view} versions={versions} />;
}

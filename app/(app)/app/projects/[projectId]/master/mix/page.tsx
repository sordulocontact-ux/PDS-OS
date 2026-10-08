import {
  ProductionPage,
  mixRoundDone,
} from "@/components/master-workflow/production-page";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadMixVersions } from "@/lib/master-workflow/mix-versions";
import { loadStepView } from "@/lib/master-workflow/transmission";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.masterWorkflow.production.mix.title} · ${fr.app.name}`,
};

// Master, Mixage: the package sent to the mixer and its follow-up, then the
// versions and their decisions (the mix validation lives here). Read by
// whoever sees the project, sent by its owner (create_master_transmission).
export default async function ProjectMasterMixPage({
  params,
}: PageProps<"/app/projects/[projectId]/master/mix">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);

  const [view, versions, masteringView] = await Promise.all([
    loadStepView(project, access, "mix"),
    loadMixVersions(project, access.personId, "mix"),
    loadStepView(project, access, "mastering"),
  ]);
  return (
    <ProductionPage
      stage="mix"
      round={{ view, versions }}
      done={mixRoundDone(masteringView)}
    />
  );
}

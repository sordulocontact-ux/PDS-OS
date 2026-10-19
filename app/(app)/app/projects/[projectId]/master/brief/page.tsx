import { BriefPage } from "@/components/master-workflow/brief-page";
import { MasterStepFrame } from "@/components/master-workflow/master-step-frame";
import { masterExchangeDefaults } from "@/lib/master-workflow/exchange-defaults";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { loadMasterBrief } from "@/lib/master-workflow/brief";
import { loadBriefQuestions } from "@/lib/master-workflow/questions";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.masterWorkflow.brief.title} · ${fr.app.name}`,
};

// Master, second step: the Brief Mix/Master of the project. Read by whoever
// sees the project, written by its owner (master_briefs, RLS).
export default async function ProjectMasterBriefPage({
  params,
}: PageProps<"/app/projects/[projectId]/master/brief">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);

  const [view, questions] = await Promise.all([
    loadMasterBrief(project, access),
    loadBriefQuestions(project, access),
  ]);
  const exchange = view.canEdit
    ? await masterExchangeDefaults(view, project.ownerPersonId)
    : null;
  return (
    <MasterStepFrame projectId={projectId} stepKey="brief">
      <BriefPage view={view} questions={questions} exchange={exchange} />
    </MasterStepFrame>
  );
}

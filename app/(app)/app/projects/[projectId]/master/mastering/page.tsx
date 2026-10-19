import { MasterStepFrame } from "@/components/master-workflow/master-step-frame";
import { RoundStep } from "@/components/master-workflow/round/round-step";
import { fr } from "@/lib/i18n/fr";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { loadRoundStep } from "@/lib/master-workflow/round-step";

export const metadata = {
  title: `${fr.masterJourney.steps.mastering.title} · ${fr.app.name}`,
};

// Master, Mastering: the package sent to the engineer, the private link, the
// rate, the versions, their feedback and the validator's decision.
export default async function ProjectMasterMasteringPage({
  params,
}: PageProps<"/app/projects/[projectId]/master/mastering">) {
  const { projectId } = await params;
  const [{ project }, round] = await Promise.all([
    masterJourneyContext(projectId),
    loadRoundStep(projectId, "mastering"),
  ]);
  return (
    <MasterStepFrame projectId={projectId} stepKey="mastering">
      <RoundStep
        round={round}
        viewerIsOwner={round.view.canEdit}
        projectTitle={project.title}
      />
    </MasterStepFrame>
  );
}

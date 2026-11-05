import { MasterStepFrame } from "@/components/master-workflow/master-step-frame";
import {
  leadVersionsOf,
  RoundLead,
} from "@/components/master-workflow/round/round-lead";
import { RoundStep } from "@/components/master-workflow/round/round-step";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { loadRoundStep } from "@/lib/master-workflow/round-step";

// Master, Mixage: the package sent to the engineer, the private link, the
// rate, the versions, their feedback and the validator's decision.
export default async function ProjectMasterMixPage({
  params,
}: PageProps<"/app/projects/[projectId]/master/mix">) {
  const { projectId } = await params;
  const [{ project }, round] = await Promise.all([
    masterJourneyContext(projectId),
    loadRoundStep(projectId, "mix"),
  ]);
  // The validator decides first (lot 4 of Ibé's feedback): the version,
  // its feedback and the decision at the head of the step.
  const lead = leadVersionsOf(round);
  const engineer =
    round.view.engineer?.name ??
    round.link?.contactName ??
    round.inHouse?.name ??
    "";
  return (
    <MasterStepFrame
      projectId={projectId}
      stepKey="mix"
      slots={
        lead.length > 0
          ? {
              lead: (
                <RoundLead
                  round={round}
                  versions={lead}
                  engineer={engineer}
                  viewerIsOwner={round.view.canEdit}
                />
              ),
            }
          : undefined
      }
    >
      <RoundStep
        round={round}
        viewerIsOwner={round.view.canEdit}
        projectTitle={project.title}
        leadIds={new Set(lead.map((v) => v.id))}
      />
    </MasterStepFrame>
  );
}

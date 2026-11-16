import {
  BriefStep,
  isOpenForViewer,
} from "@/components/master-workflow/brief/brief-step";
import { QuestionList } from "@/components/master-workflow/brief-questions";
import { MasterStepFrame } from "@/components/master-workflow/master-step-frame";
import { ContractGapsCallout } from "@/components/legal/contract-gaps-notice";
import { can } from "@/lib/auth/access";
import { loadContractGaps } from "@/lib/legal/contract-gaps";
import { loadBriefStep } from "@/lib/master-workflow/brief-step";
import { masterExchangeDefaults } from "@/lib/master-workflow/exchange-defaults";
import { liveTransmission } from "@/lib/master-workflow/journey";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { loadMasterTitleScope } from "@/lib/master-workflow/title-scope";

// Master, Brief: what the engineers will receive, as a document whose facts
// are changed in place, then recorded by the project's owner.
export default async function ProjectMasterBriefPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/master/brief">) {
  const [{ projectId }, { titre }] = await Promise.all([params, searchParams]);
  const { access, project, facts } = await masterJourneyContext(projectId);
  // One Brief for all the titles (décision 4): a collective's title stays in
  // the trail only, to find it again on the next step (lot 8).
  const scope = await loadMasterTitleScope(
    projectId,
    "brief",
    typeof titre === "string" ? titre : null,
  );
  const step = await loadBriefStep(
    project,
    access,
    liveTransmission(facts, "mix")?.createdAt ?? null,
  );
  const [exchange, shootGaps, releaseGaps] = await Promise.all([
    step.view.canEdit
      ? masterExchangeDefaults(step.view, project.ownerPersonId)
      : null,
    // A collective (lot 12 bis, décision 6): the contracts not signed, said
    // while the Brief is prepared; nothing is blocked here.
    project.collective
      ? loadContractGaps(projectId, "shoot")
      : Promise.resolve([]),
    project.collective
      ? loadContractGaps(projectId, "release")
      : Promise.resolve([]),
  ]);
  // A question asked to the viewer (Nadia's answer) comes first, the Brief
  // folded under it (lot 4 of Ibé's feedback).
  const mine = step.questions.questions.filter(isOpenForViewer);
  return (
    <MasterStepFrame
      projectId={projectId}
      stepKey="brief"
      titleScope={scope}
      slots={
        mine.length > 0
          ? {
              lead: (
                <QuestionList
                  projectId={projectId}
                  questions={mine}
                  canApply={false}
                />
              ),
            }
          : undefined
      }
    >
      <ContractGapsCallout
        projectId={projectId}
        shoot={shootGaps}
        release={releaseGaps}
        canOpenLegal={can(access, "manage_legal")}
      />
      <BriefStep
        step={step}
        exchange={exchange}
        ownerName={project.ownerName}
        projectTitle={project.title}
        lead={mine.length > 0}
      />
    </MasterStepFrame>
  );
}

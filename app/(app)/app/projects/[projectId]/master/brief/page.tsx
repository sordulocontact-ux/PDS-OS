import { BriefStep } from "@/components/master-workflow/brief/brief-step";
import { MasterStepFrame } from "@/components/master-workflow/master-step-frame";
import { fr } from "@/lib/i18n/fr";
import { loadBriefStep } from "@/lib/master-workflow/brief-step";
import { masterExchangeDefaults } from "@/lib/master-workflow/exchange-defaults";
import { liveTransmission } from "@/lib/master-workflow/journey";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";

export const metadata = {
  title: `${fr.masterJourney.steps.brief.title} · ${fr.app.name}`,
};

// Master, Brief: what the engineers will receive, as a document whose facts
// are changed in place, then recorded by the project's owner.
export default async function ProjectMasterBriefPage({
  params,
}: PageProps<"/app/projects/[projectId]/master/brief">) {
  const { projectId } = await params;
  const { access, project, facts } = await masterJourneyContext(projectId);
  const step = await loadBriefStep(
    project,
    access,
    liveTransmission(facts, "mix")?.createdAt ?? null,
  );
  const exchange = step.view.canEdit
    ? await masterExchangeDefaults(step.view, project.ownerPersonId)
    : null;
  return (
    <MasterStepFrame projectId={projectId} stepKey="brief">
      <BriefStep
        step={step}
        exchange={exchange}
        ownerName={project.ownerName}
        projectTitle={project.title}
      />
    </MasterStepFrame>
  );
}

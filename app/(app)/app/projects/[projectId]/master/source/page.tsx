import { MasterStepFrame } from "@/components/master-workflow/master-step-frame";
import {
  pickSourceTitle,
  SourceLead,
  sourceGestureFirst,
} from "@/components/master-workflow/source/source-lead";
import { SourceStep } from "@/components/master-workflow/source/source-step";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { loadSourceStep } from "@/lib/master-workflow/source-step";

// Master, Source: the version each title's mix starts from, confirmed by
// the owner, its final vocals awaited or anticipated (ticket § 1 and § 2).
// The former État du master and « Où en est la préparation » end here.
export default async function ProjectMasterSourcePage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/master/source">) {
  const [{ projectId }, { titre }] = await Promise.all([params, searchParams]);
  const [{ project }, view] = await Promise.all([
    masterJourneyContext(projectId),
    loadSourceStep(projectId),
  ]);
  const titleId = typeof titre === "string" ? titre : null;
  // The owner's gesture heads the step (Akili, 02/11/2026: « on ne sait pas
  // quoi faire en arrivant »), the checks below it.
  const title = pickSourceTitle(view, titleId);
  return (
    <MasterStepFrame
      projectId={projectId}
      stepKey="source"
      slots={
        sourceGestureFirst(view, title)
          ? { lead: <SourceLead view={view} title={title} /> }
          : undefined
      }
    >
      <SourceStep view={view} titleId={titleId} ownerName={project.ownerName} />
    </MasterStepFrame>
  );
}

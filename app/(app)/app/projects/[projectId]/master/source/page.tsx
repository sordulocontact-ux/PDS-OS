import { MasterStepFrame } from "@/components/master-workflow/master-step-frame";
import { SourceStep } from "@/components/master-workflow/source/source-step";
import { fr } from "@/lib/i18n/fr";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { loadSourceStep } from "@/lib/master-workflow/source-step";

export const metadata = {
  title: `${fr.masterJourney.steps.source.title} · ${fr.app.name}`,
};

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
  return (
    <MasterStepFrame projectId={projectId} stepKey="source">
      <SourceStep
        view={view}
        titleId={typeof titre === "string" ? titre : null}
        ownerName={project.ownerName}
      />
    </MasterStepFrame>
  );
}

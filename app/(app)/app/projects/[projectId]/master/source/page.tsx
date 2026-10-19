import { MasterInventory } from "@/components/master-workflow/master-inventory";
import { MasterStepFrame } from "@/components/master-workflow/master-step-frame";
import { MixDiagnosis } from "@/components/master-workflow/mix-diagnosis";
import { routes } from "@/lib/auth/redirects";
import { asFactStatus } from "@/lib/facts/views";
import { fr } from "@/lib/i18n/fr";
import { loadMasterInventory } from "@/lib/master-workflow/inventory";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { loadStepView } from "@/lib/master-workflow/transmission";

export const metadata = {
  title: `${fr.masterJourney.steps.source.title} · ${fr.app.name}`,
};

// Master, Source: the version each title's mix starts from, confirmed.
export default async function ProjectMasterSourcePage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/master/source">) {
  const [{ projectId }, { state }] = await Promise.all([params, searchParams]);
  const { access, project } = await masterJourneyContext(projectId);
  const [inventory, mix] = await Promise.all([
    loadMasterInventory(project, access),
    loadStepView(project, access, "mix"),
  ]);
  return (
    <MasterStepFrame projectId={projectId} stepKey="source">
      <MasterInventory
        inventory={inventory}
        basePath={routes.projectMasterStep(projectId, "source")}
        state={asFactStatus(state)}
        lead={<MixDiagnosis view={mix} />}
      />
    </MasterStepFrame>
  );
}

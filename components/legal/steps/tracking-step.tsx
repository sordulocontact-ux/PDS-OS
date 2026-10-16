import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import {
  TrackingView,
  asTrackingView,
} from "@/components/legal/tracking/tracking-view";
import { contractProofOf } from "@/lib/contracts/proof";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { loadClearances } from "@/lib/legal/clearance/queries";
import { loadAgreementsGenerated } from "@/lib/legal/contracts/auto-generate";
import { loadFormalities } from "@/lib/legal/formalities/queries";
import { loadForms } from "@/lib/legal/forms/queries";
import { loadSplits } from "@/lib/legal/splits/queries";
import { loadTracking } from "@/lib/legal/tracking/queries";

/**
 * Suivi: each démarche is done from its line, so every branch's data is read
 * here (the ready agreements are generated on the way). Nothing is read while
 * the plan is not launched: the frame says what unlocks the step.
 */
export async function TrackingStep({
  projectId,
  view,
  selected,
}: {
  projectId: string;
  view: unknown;
  selected: string | null;
}) {
  const {
    project,
    access,
    tracking: launched,
  } = await legalJourneyContext(projectId);
  if (launched.state !== "tracking")
    return (
      <LegalStepFrame projectId={projectId} stepKey="tracking">
        {null}
      </LegalStepFrame>
    );
  // The ready agreements are generated first, the Suivi read after them: a
  // contract just generated shows on its line.
  const agreements = await loadAgreementsGenerated(project, access);
  const [tracking, clearances, forms, splits, formalities] = await Promise.all([
    loadTracking(project, access),
    loadClearances(project, access),
    loadForms(project, access),
    loadSplits(project, access),
    loadFormalities(project, access),
  ]);
  const proof = await contractProofOf(
    agreements.rows.flatMap((row) => (row.contract ? [row.contract.id] : [])),
  );
  return (
    <LegalStepFrame projectId={projectId} stepKey="tracking">
      <TrackingView
        projectId={projectId}
        tracking={tracking}
        view={asTrackingView(view)}
        selected={selected}
        titles={project.masters.map((m) => ({ id: m.id, title: m.title }))}
        data={{
          forms,
          agreements,
          splits,
          clearances,
          formalities,
          proof: Object.fromEntries(proof),
        }}
      />
    </LegalStepFrame>
  );
}

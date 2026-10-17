import {
  ConfirmationPanel,
  ConfirmationStatus,
} from "@/components/legal/confirmation/confirmation-view";
import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { proposeLegalPlan } from "@/lib/legal/plan/queries";

/** Confirmation: the dossier written by the code, confirmed by a person. */
export async function ConfirmationStep({ projectId }: { projectId: string }) {
  const { project, access, confirmation } =
    await legalJourneyContext(projectId);
  // JUR-06: before confirming, the démarches the plan will hold.
  const preview =
    confirmation.status !== "confirmed" && confirmation.openQuestions === 0
      ? await proposeLegalPlan(project, access)
      : [];
  return (
    <LegalStepFrame projectId={projectId} stepKey="confirmation">
      <div className="flex flex-col gap-6">
        <ConfirmationStatus projectId={projectId} confirmation={confirmation} />
        <ConfirmationPanel
          projectId={projectId}
          confirmation={confirmation}
          planPreview={preview.map((item) => item.kind)}
        />
      </div>
    </LegalStepFrame>
  );
}

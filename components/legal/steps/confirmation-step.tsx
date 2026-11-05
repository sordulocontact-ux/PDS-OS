import { ConfirmationView } from "@/components/legal/confirmation/confirmation-view";
import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { can } from "@/lib/auth/access";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { proposeLegalPlan } from "@/lib/legal/plan/queries";

/** Confirmation: the dossier written by the code, confirmed by a person. */
export async function ConfirmationStep({ projectId }: { projectId: string }) {
  const { project, access, confirmation, steps, intake } =
    await legalJourneyContext(projectId);
  // JUR-06: before confirming, the démarches the plan will hold.
  const preview =
    confirmation.status !== "confirmed" && confirmation.openQuestions === 0
      ? await proposeLegalPlan(project, access)
      : [];
  return (
    <LegalStepFrame projectId={projectId} stepKey="confirmation">
      <ConfirmationView
        projectId={projectId}
        confirmation={confirmation}
        step={steps.find((s) => s.key === "confirmation")}
        canAct={can(access, "manage_legal")}
        tagged={project.masters.length > 1}
        planPreview={preview.map((item) => item.kind)}
        questions={intake.questions}
      />
    </LegalStepFrame>
  );
}

import { IntakeWorkspace } from "@/components/legal/intake/intake-workspace";
import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { legalJourneyContext } from "@/lib/legal/journey-context";

/** Cadrage juridique: one question at a time, then the answers. */
export async function FramingStep({
  projectId,
  question,
}: {
  projectId: string;
  // `?question=<key>:<title|project>`: that question opens first.
  question: string | null;
}) {
  const { intake } = await legalJourneyContext(projectId);
  return (
    <LegalStepFrame projectId={projectId} stepKey="framing" gestureIsStep>
      <IntakeWorkspace
        // « Corriger » from the dossier reopens its question: a new
        // workspace for it.
        key={question ?? "intake"}
        projectId={projectId}
        questions={intake.questions}
        notAsked={intake.notAsked}
        initialQuestion={question}
      />
    </LegalStepFrame>
  );
}

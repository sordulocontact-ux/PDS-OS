import { CallFileUploadFold } from "@/components/calls/call-file-upload-fold";
import { CallProcessing } from "@/components/calls/call-processing";
import { CallRecorder } from "@/components/calls/call-recorder";
import { PlannedCallFacts } from "@/components/calls/prep/planned-call-facts";
import { loadCallInPlace, loadPlannedCall } from "@/lib/calls/prep/planned";
import { callPrep } from "@/lib/i18n/fr/call-prep";

const fr = { callPrep };

/**
 * A prepared call recorded and processed in its step, never on the call's
 * page (Sacha 28/10/2026 for the Cadrage, 07/11/2026 for every module:
 * « directement enregistrer l'appel depuis cette page »). Planned: the call
 * in one block, then « Enregistrer l'échange » (or « le call »), which asks
 * for the Meet tab at once and records it here, a module's own gesture
 * beside it (`beside`: the Cadrage's « Annuler l'échange »), a file as the
 * alternative. Recorded: the transcription and the report run here, then
 * CallProcessing takes the owner where PO's proposals wait. The call's page
 * stays the archive (Calls, Calendrier).
 */
export async function PlannedCallInPlace({
  callId,
  noun,
  goal,
  waiting,
  beside,
}: {
  callId: string;
  noun: "exchange" | "call";
  // The objective, when the module keeps it (framing_calls.purpose).
  goal?: string | null;
  // What someone else than the owner reads instead of the buttons.
  waiting?: { name: string; what: string } | null;
  beside?: React.ReactNode;
}) {
  const [planned, state] = await Promise.all([
    loadPlannedCall(callId),
    loadCallInPlace(callId),
  ]);
  if (!planned || !state) return null;
  if (planned.held)
    return (
      <CallProcessing
        projectId={planned.projectId}
        callId={callId}
        status={state.status}
        errorCode={state.errorCode}
        hasTranscript={state.hasTranscript}
        ownerName={waiting?.name ?? null}
      />
    );
  return (
    <PlannedCallFacts
      call={planned}
      noun={noun}
      goal={goal}
      waiting={waiting}
      action={
        <CallRecorder
          callId={callId}
          organizationId={state.organizationId}
          saved={state.takes}
          videoCall={planned.meetingUrl !== null}
          compact={{ label: fr.callPrep.planned.record[noun], beside }}
          alternative={
            <CallFileUploadFold
              callId={callId}
              organizationId={state.organizationId}
            />
          }
        />
      }
    />
  );
}

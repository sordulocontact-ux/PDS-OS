import { AudioUploadFold } from "@/components/calls/audio-upload-fold";
import { CallProcessing } from "@/components/calls/call-processing";
import { CallRecorder } from "@/components/calls/call-recorder";
import { PlannedCallFacts } from "@/components/calls/prep/planned-call-facts";
import { CancelExchangeButton } from "@/components/framing/start/cancel-exchange-button";
import { callWhen } from "@/lib/calls/prep/dates";
import type { CallInPlace, PlannedCall } from "@/lib/calls/prep/planned";
import { callPrep } from "@/lib/i18n/fr/call-prep";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { callPrep, framingJourney };

/**
 * The framing exchange recorded and processed in its card, never on the
 * call's page (Sacha 28/10/2026: « le bouton Enregistrer enregistre le
 * call »). Planned: the call in one block, then « Enregistrer l'échange »,
 * which asks for the Meet tab at once and records it here, « Annuler
 * l'échange » beside it. Recorded: the transcription and the report run
 * here, then PO's proposals open in « Les 6 dimensions ».
 */
export function ExchangeInPlace({
  planned,
  state,
  recorded,
  canEdit,
  ownerName,
}: {
  planned: PlannedCall;
  state: CallInPlace;
  recorded: boolean;
  canEdit: boolean;
  ownerName: string | null;
}) {
  if (recorded)
    return (
      <CallProcessing
        projectId={planned.projectId}
        callId={planned.callId}
        status={state.status}
        errorCode={state.errorCode}
        hasTranscript={state.hasTranscript}
      />
    );
  return (
    <PlannedCallFacts
      call={planned}
      noun="exchange"
      waiting={
        canEdit
          ? null
          : {
              name: ownerName ?? "—",
              what: fr.framingJourney.todo.hold.toLowerCase(),
            }
      }
      action={
        <CallRecorder
          callId={planned.callId}
          organizationId={state.organizationId}
          saved={state.takes}
          videoCall={planned.meetingUrl !== null}
          compact={{
            label: fr.callPrep.planned.record.exchange,
            beside: planned.projectId && (
              <CancelExchangeButton
                projectId={planned.projectId}
                callId={planned.callId}
                when={callWhen(planned.occurredAt)}
              />
            ),
          }}
          alternative={
            <AudioUploadFold
              callId={planned.callId}
              organizationId={state.organizationId}
            />
          }
        />
      }
    />
  );
}

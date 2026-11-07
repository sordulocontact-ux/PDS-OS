import { CallFileUploadFold } from "@/components/calls/call-file-upload-fold";
import { CallRecorder } from "@/components/calls/call-recorder";
import type { CallDetail } from "@/lib/calls/queries";

/**
 * Record a call from its page: the recorder (one button that starts at
 * once with `compact`, the how-to under it), an existing file folded under
 * it, a recording interrupted earlier found again.
 */
export function CallRecording({
  call,
  compact,
}: {
  call: CallDetail;
  compact?: { label: string; beside?: React.ReactNode };
}) {
  return (
    <CallRecorder
      callId={call.id}
      organizationId={call.organizationId}
      saved={call.recording.takes}
      // A call with a video link is held in visio: nothing to choose.
      videoCall={call.meetingUrl !== null}
      compact={compact}
      alternative={
        <CallFileUploadFold
          callId={call.id}
          organizationId={call.organizationId}
        />
      }
    />
  );
}

import { AudioUpload } from "@/components/calls/audio-upload";
import { CallRecorder } from "@/components/calls/call-recorder";
import { CallProcessing } from "@/components/calls/call-processing";
import type { CallDetail } from "@/lib/calls/queries";
import { formatMegabytes } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";

/** Record or upload (consent granted, no audio yet), then player and processing. */
export function CallRecording({
  call,
  audioUrl,
  hasTranscript,
  hasReport,
}: {
  call: CallDetail;
  audioUrl: string | null;
  hasTranscript: boolean;
  hasReport: boolean;
}) {
  const t = fr.calls.audio;

  if (call.consent !== "granted") {
    return (
      <p className="text-sm text-muted-foreground">
        {call.consent === "pending" ? t.blockedPending : t.blockedRefused}
      </p>
    );
  }
  if (!call.audioPath) {
    // Recording in the app first; an existing file remains the alternative.
    return (
      <CallRecorder
        callId={call.id}
        organizationId={call.organizationId}
        alternative={
          <div className="mt-2 grid gap-3 border-t border-[color:var(--border-hairline)] pt-5">
            <p className="text-sm font-medium">{fr.calls.recorder.or}</p>
            <AudioUpload
              callId={call.id}
              organizationId={call.organizationId}
            />
          </div>
        }
      />
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        {audioUrl ? (
          <audio controls preload="metadata" src={audioUrl} className="w-full">
            <track kind="captions" />
          </audio>
        ) : (
          <p className="text-sm text-muted-foreground">{t.playerUnavailable}</p>
        )}
        {call.audioBytes !== null && (
          <p className="text-xs text-muted-foreground">
            {call.audioMime} · {t.size(formatMegabytes(call.audioBytes))}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <h3 className="text-sm font-medium">{fr.calls.process.title}</h3>
        <CallProcessing
          callId={call.id}
          status={call.status}
          errorCode={call.errorCode}
          hasTranscript={hasTranscript}
          hasReport={hasReport}
        />
      </div>
    </div>
  );
}

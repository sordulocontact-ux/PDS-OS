import { AudioUpload } from "@/components/calls/audio-upload";
import { CallProcessing } from "@/components/calls/call-processing";
import { CallRecorder } from "@/components/calls/call-recorder";
import type { CallDetail } from "@/lib/calls/queries";
import { formatMegabytes } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";

/** Record (or drop a file) when there is no audio yet, then the automatic processing. */
export function CallRecording({
  call,
  audioUrls,
  hasTranscript,
}: {
  call: CallDetail;
  audioUrls: Array<string | null>;
  hasTranscript: boolean;
}) {
  if (!call.audioPath) {
    // Recording in the app first; an existing file is the fallback, folded.
    return (
      <CallRecorder
        callId={call.id}
        organizationId={call.organizationId}
        saved={call.recording.takes}
        videoCall={call.meetingUrl !== null}
        alternative={
          <details className="group border-t border-[color:var(--border-hairline)] pt-4">
            <summary className="w-fit cursor-pointer rounded-md text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              {fr.calls.recorder.or}
            </summary>
            <div className="pt-4">
              <AudioUpload
                callId={call.id}
                organizationId={call.organizationId}
              />
            </div>
          </details>
        }
      />
    );
  }

  return (
    <div className="grid gap-6">
      <CallProcessing
        projectId={call.projectId}
        callId={call.id}
        status={call.status}
        errorCode={call.errorCode}
        hasTranscript={hasTranscript}
      />
      <CallAudio call={call} audioUrls={audioUrls} />
    </div>
  );
}

/** The stored recording, to listen back: each take in order when in parts. */
export function CallAudio({
  call,
  audioUrls,
}: {
  call: CallDetail;
  audioUrls: Array<string | null>;
}) {
  const t = fr.calls.audio;
  const parts = audioUrls.length > 1;
  return (
    <div className="grid gap-2 border-t border-[color:var(--border-hairline)] pt-4">
      {audioUrls.length === 0 || audioUrls.some((url) => url === null) ? (
        <p className="text-sm text-muted-foreground">{t.playerUnavailable}</p>
      ) : (
        audioUrls.map((url, i) => (
          <div key={url} className="grid gap-1">
            {parts && (
              <p className="text-xs text-muted-foreground">{t.part(i + 1)}</p>
            )}
            <audio
              controls
              preload="metadata"
              src={url ?? undefined}
              className="w-full"
            >
              <track kind="captions" />
            </audio>
          </div>
        ))
      )}
      {call.audioBytes !== null && (
        <p className="text-xs text-muted-foreground">
          {call.audioMime} · {t.size(formatMegabytes(call.audioBytes))}
        </p>
      )}
    </div>
  );
}

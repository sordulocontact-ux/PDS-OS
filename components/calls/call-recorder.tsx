"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { ChoiceCards } from "@/components/ui/choice-cards";
import {
  isRecordingSupported,
  type RecorderSource,
} from "@/components/calls/recorder-media";
import { RecordingLive } from "@/components/calls/recording-live";
import { RecordingReview } from "@/components/calls/recording-review";
import { useRecorder } from "@/components/calls/use-recorder";
import { useAudioMeter } from "@/components/ui/use-audio-meter";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { uploadCallAudio, type UploadError } from "@/lib/calls/upload-audio";
import { fr } from "@/lib/i18n/fr";

const noSubscribe = () => () => {};

/** Record the call from the browser, listen back, then send it like an uploaded file. */
export function CallRecorder({
  callId,
  organizationId,
  alternative,
}: {
  callId: string;
  organizationId: string;
  /** The file picker: shown only before recording starts, one primary action at a time. */
  alternative?: ReactNode;
}) {
  const t = fr.calls.recorder;
  const router = useRouter();
  const canEdit = useCanEditProject();
  const meter = useAudioMeter();
  // Browser capability, read without a server/client mismatch (the server assumes support).
  const tabSupported = useSyncExternalStore(
    noSubscribe,
    () => isRecordingSupported("tab"),
    () => true,
  );
  const [chosen, setChosen] = useState<RecorderSource>("tab");
  const source: RecorderSource = tabSupported ? chosen : "mic";
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<UploadError | null>(null);
  const rec = useRecorder(meter.push);

  // Leaving the page would lose an unsent recording: let the browser ask first.
  const unsent =
    rec.status === "recording" ||
    rec.status === "paused" ||
    rec.status === "stopped";
  useEffect(() => {
    if (!unsent) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [unsent]);

  // During the call the user sits on the Meet tab: the tab title carries the state.
  const live = rec.status === "recording" || rec.status === "paused";
  useEffect(() => {
    if (!live) return;
    const original = document.title;
    document.title = rec.tabSilent
      ? `${t.silenceTab} · ${fr.app.name}`
      : `● ${rec.status === "paused" ? t.paused : t.recording} · ${fr.app.name}`;
    return () => {
      document.title = original;
    };
  }, [live, rec.status, rec.tabSilent, t]);

  async function send() {
    if (!rec.recording) return;
    setSending(true);
    setSendError(null);
    const { blob, ext, mime } = rec.recording;
    const result = await uploadCallAudio({
      callId,
      organizationId,
      body: blob,
      ext,
      mime,
    });
    setSending(false);
    if (!result.ok) return setSendError(result.error);
    rec.discard();
    toast.success(t.sent);
    router.refresh();
  }

  // Recording writes the call's audio: owner only. Hooks above stay unconditional.
  if (!canEdit) return null;

  return (
    <div className="grid gap-4">
      {(rec.status === "idle" || rec.status === "requesting") && (
        <>
          <ChoiceCards
            name="recorder-source"
            legend={t.sourceLabel}
            value={source}
            onChange={setChosen}
            disabled={rec.status === "requesting"}
            choices={[
              {
                value: "tab",
                label: t.sources.tab.label,
                hint: tabSupported ? t.sources.tab.hint : t.tabUnavailable,
                disabled: !tabSupported,
              },
              {
                value: "mic",
                label: t.sources.mic.label,
                hint: t.sources.mic.hint,
              },
            ]}
          />
          <p className="text-sm text-muted-foreground">{t.reminder}</p>
          <Button
            onClick={() => void rec.start(source)}
            disabled={rec.status === "requesting"}
            className="justify-self-start"
          >
            {rec.status === "requesting" ? t.requesting : t.start}
          </Button>
        </>
      )}
      {(rec.status === "recording" || rec.status === "paused") && (
        <RecordingLive
          paused={rec.status === "paused"}
          fromTab={rec.source === "tab"}
          tabSilent={rec.tabSilent}
          micSilent={rec.micSilent}
          onKeepRecording={rec.dismissSilence}
          elapsed={rec.elapsed}
          meterRef={meter.ref}
          onPauseToggle={rec.status === "paused" ? rec.resume : rec.pause}
          onStop={rec.stop}
        />
      )}
      {rec.status === "stopped" && rec.recording && (
        <RecordingReview
          recording={rec.recording}
          sending={sending}
          sendError={sendError}
          onSend={() => void send()}
          onDiscard={rec.discard}
        />
      )}
      {rec.error && (
        <p role="alert" className="text-sm text-error">
          {t.errors[rec.error]}
        </p>
      )}
      {rec.status === "idle" && alternative}
    </div>
  );
}

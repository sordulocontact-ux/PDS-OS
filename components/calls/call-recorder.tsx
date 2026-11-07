"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "@/components/ui/toast";

import {
  isRecordingSupported,
  type RecorderSource,
} from "@/components/calls/recorder-media";
import { RecorderStart } from "@/components/calls/recorder-start";
import { RecordingLive } from "@/components/calls/recording-live";
import { RecordingRecovery } from "@/components/calls/recording-recovery";
import { RecordingReview } from "@/components/calls/recording-review";
import { useMicDiagnosis } from "@/components/calls/use-mic-diagnosis";
import { useRecorder } from "@/components/calls/use-recorder";
import { useRecordingSaver } from "@/components/calls/use-recording-saver";
import { useAudioMeter } from "@/components/ui/use-audio-meter";
import { useCanEditProject } from "@/components/projects/edit-access";
import type { CallErrorCode } from "@/lib/calls/constants";
import { savedMs, type SavedTake } from "@/lib/calls/recording";
import { discardRecording, sendRecording } from "@/lib/calls/recording-actions";
import { calls } from "@/lib/i18n/fr/calls";
import { core } from "@/lib/i18n/fr/core";

const fr = { app: core.app, calls };

const noSubscribe = () => () => {};

/**
 * Record the call from the browser, saved while it happens (PROJ-BUG-01):
 * a reload or a lost microphone keeps what is saved, and the recording can
 * be resumed, sent as it is, replaced by a file, or deleted.
 */
export function CallRecorder({
  callId,
  organizationId,
  saved,
  videoCall = false,
  alternative,
  compact,
}: {
  callId: string;
  organizationId: string;
  // Takes saved earlier and not sent (found again after a reload).
  saved: SavedTake[];
  // The call has a video link: it is held in visio, nothing to choose
  // (Sacha, 10/10/2026) — the tab is recorded when the browser can.
  videoCall?: boolean;
  /** The file picker: shown only when nothing is being recorded. */
  alternative?: ReactNode;
  // In a step's card (Cadrage, Sacha 28/10): one button that starts at once
  // (« Enregistrer l'échange »), a gesture of the module beside it, and the
  // how-to in one line under them.
  compact?: { label: string; beside?: ReactNode };
}) {
  const t = fr.calls.recorder;
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
  const [sending, setSending] = useState<"saving" | "sending" | null>(null);
  const [sendError, setSendError] = useState<CallErrorCode | null>(null);
  const saver = useRecordingSaver({ callId, organizationId, saved });
  const rec = useRecorder(meter.push, saver.flush, {
    prepare: saver.prepare,
    onChunk: saver.onChunk,
  });
  const live = rec.status === "recording" || rec.status === "paused";
  const diagnosis = useMicDiagnosis(!live && rec.status !== "requesting");
  const hasSaved = savedMs(saver.takes) > 0 || saver.unsavedMs > 0;

  // Leaving now would lose what is not saved yet: let the browser ask first.
  const unsaved = live || saver.unsavedMs > 0 || sending !== null;
  useEffect(() => {
    if (!unsaved) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [unsaved]);

  // During the call the user sits on the Meet tab: the tab title carries the state.
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
    setSendError(null);
    // Only what the server holds is sent: the last seconds are saved first.
    setSending("saving");
    await saver.whenSaved();
    setSending("sending");
    const result = await sendRecording(callId).catch(
      () => ({ ok: false, error: "save_failed" }) as const,
    );
    setSending(null);
    if (!result.ok) return setSendError(result.error);
    saver.forget();
    rec.discard();
    toast.success(t.sent);
  }

  async function discard() {
    const result = await discardRecording(callId).catch(
      () => ({ ok: false, error: "save_failed" }) as const,
    );
    if (!result.ok) return setSendError(result.error);
    saver.forget();
    rec.discard();
  }

  // Recording writes the call's audio: owner only. Hooks above stay unconditional.
  if (!canEdit) return null;

  const sendingLabel =
    sending === "saving"
      ? t.savingRest
      : sending === "sending"
        ? t.sending
        : null;
  const problem = rec.error ?? diagnosis;
  const problemText = problem ? t.errors[problem] : null;
  const interrupted = rec.status === "stopped" && rec.interruption !== null;
  const recovering =
    interrupted ||
    ((rec.status === "idle" || rec.status === "requesting") && hasSaved);

  if (recovering)
    return (
      <RecordingRecovery
        takes={saver.takes}
        interruption={rec.interruption}
        unsavedMs={saver.unsavedMs}
        failing={saver.failing}
        starting={rec.status === "requesting"}
        sendingLabel={sendingLabel}
        error={problemText ?? (sendError ? fr.calls.errors[sendError] : null)}
        onResume={() => void rec.start(rec.source ?? source)}
        onSend={() => void send()}
        onDiscard={() => void discard()}
        alternative={alternative}
      />
    );

  return (
    <div className="grid gap-4">
      {(rec.status === "idle" || rec.status === "requesting") && (
        <RecorderStart
          source={source}
          onSourceChange={setChosen}
          tabSupported={tabSupported}
          videoCall={videoCall}
          tabFailed={
            rec.error === "tab_cancelled" ||
            rec.error === "tab_failed" ||
            rec.error === "no_tab_audio"
          }
          starting={rec.status === "requesting"}
          problem={
            problemText
              ? { text: problemText, tone: rec.error ? "danger" : "warning" }
              : null
          }
          onStart={() => void rec.start(source)}
          compact={compact}
        />
      )}
      {live && (
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
          savedMs={saver.recordedMs - saver.unsavedMs}
          unsavedMs={saver.unsavedMs}
          failing={saver.failing}
        />
      )}
      {rec.status === "stopped" && rec.recording && (
        <RecordingReview
          recording={rec.recording}
          takes={saver.takes}
          unsavedMs={saver.unsavedMs}
          failing={saver.failing}
          sendingLabel={sendingLabel}
          sendError={sendError}
          onSend={() => void send()}
          onDiscard={() => void discard()}
        />
      )}
      {rec.status === "stopped" && rec.error && (
        <p role="alert" className="text-sm text-error">
          {t.errors[rec.error]}
        </p>
      )}
      {rec.status === "idle" && alternative}
    </div>
  );
}

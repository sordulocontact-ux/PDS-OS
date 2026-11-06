"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AudioUpload } from "@/components/calls/audio-upload";
import { AudioUploadFold } from "@/components/calls/audio-upload-fold";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { ProcessingSteps } from "@/components/ui/processing-steps";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

type ErrorKey = keyof typeof fr.calls.errors;

/**
 * « Maintenant » of a call held on its own Meet, once over: the transcript
 * Meet wrote is taken back by itself (POST …/meet-transcript), then the page
 * reloads and the usual processing writes the report (`CallProcessing`).
 * Not ready yet: try again, the recording can still be dropped (folded).
 * No transcript to take (not transcribed, Google not connected): dropping
 * the recording becomes the gesture.
 */
export function MeetTranscriptFetch({
  callId,
  organizationId,
  errorCode,
}: {
  callId: string;
  organizationId: string;
  // Left by an earlier try (`calls.error_code`): said until the next one.
  errorCode: string | null;
}) {
  const t = fr.calls.page.now.meet;
  const router = useRouter();
  const canEdit = useCanEditProject();
  // Taken back by itself on arrival, unless an earlier try already said the
  // Meet has nothing to give (not transcribed, Google not connected).
  const auto = canEdit && (!errorCode || errorCode === "meet_pending");
  const [running, setRunning] = useState(auto);
  const [error, setError] = useState<string | null>(
    !auto && errorCode?.startsWith("meet_") ? errorCode : null,
  );
  const started = useRef(false);

  async function take() {
    let result: { ok: boolean; error?: string };
    try {
      const response = await fetch(`/api/calls/${callId}/meet-transcript`, {
        method: "POST",
      });
      result = (await response.json()) as typeof result;
    } catch {
      result = { ok: false, error: "network" };
    }
    if (result.ok) return router.refresh();
    setRunning(false);
    setError(result.error ?? "unknown");
  }

  function retry() {
    setRunning(true);
    setError(null);
    void take();
  }

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    void take();
    // Runs once per mount; take() reads the props of that render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = error === "meet_pending" || error === "network";
  const dropInstead = error !== null && !pending;

  return (
    <div className="grid gap-4">
      <ProcessingSteps
        label={fr.calls.process.title}
        doneLabel={fr.calls.process.stepDone}
        steps={[
          {
            key: "meet",
            label: fr.calls.process.steps.meet,
            state: running ? "active" : "waiting",
          },
          {
            key: "report",
            label: fr.calls.process.steps.report,
            state: "waiting",
          },
        ]}
      />
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {running ? t.fetching : null}
      </p>
      {error && (
        <p role="alert" className="text-sm text-error">
          {fr.calls.errors[error as ErrorKey] ?? fr.calls.errors.unknown}
        </p>
      )}
      {canEdit && pending && !running && (
        <Button onClick={retry} className="justify-self-start">
          {t.retry}
        </Button>
      )}
      {canEdit && dropInstead && (
        <AudioUpload callId={callId} organizationId={organizationId} />
      )}
      {canEdit && !dropInstead && !running && (
        <AudioUploadFold
          callId={callId}
          organizationId={organizationId}
          label={t.instead}
        />
      )}
    </div>
  );
}

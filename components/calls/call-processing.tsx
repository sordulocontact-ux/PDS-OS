"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ProcessingSteps,
  type StepState,
} from "@/components/calls/processing-steps";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import type { ActionResult, CallStatus } from "@/lib/calls/constants";
import { fr } from "@/lib/i18n/fr";

type ErrorKey = keyof typeof fr.calls.errors;
type Phase = "transcribing" | "extracting";
type StepResult = ActionResult & { briefFilled?: boolean };

// A job started elsewhere (another tab, a reload): check back on it.
const POLL_MS = 5000;

async function post(callId: string, step: "transcribe" | "extract") {
  try {
    const response = await fetch(`/api/calls/${callId}/${step}`, {
      method: "POST",
    });
    return (await response.json()) as StepResult;
  } catch {
    return { ok: false, error: "network" } as const;
  }
}

const errorText = (code: string | null) =>
  code ? (fr.calls.errors[code as ErrorKey] ?? fr.calls.errors.unknown) : null;

/**
 * Starts by itself once the recording is in: transcription, report, then the
 * Brief is pre-filled and the user lands on the framing. Both steps persist
 * their status server-side, so a reload picks up where the call stands. An
 * internal meeting (`projectId` null) has no Brief: it stops at the report.
 */
export function CallProcessing({
  projectId,
  callId,
  status,
  errorCode,
  hasTranscript,
}: {
  projectId: string | null;
  callId: string;
  status: CallStatus;
  errorCode: string | null;
  hasTranscript: boolean;
}) {
  const t = fr.calls.process;
  const router = useRouter();
  const canEdit = useCanEditProject();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const runningElsewhere =
    phase === null && (status === "transcribing" || status === "extracting");
  const failed = phase === null && (error !== null || status === "failed");

  async function run() {
    setError(null);
    if (!hasTranscript) {
      setPhase("transcribing");
      const transcribed = await post(callId, "transcribe");
      if (!transcribed.ok) {
        setPhase(null);
        router.refresh();
        return setError(transcribed.error);
      }
    }
    setPhase("extracting");
    const extracted = await post(callId, "extract");
    if (!extracted.ok) {
      setPhase(null);
      router.refresh();
      return setError(extracted.error);
    }
    if (extracted.briefFilled && projectId) {
      toast.success(t.briefFilled);
      router.push(routes.projectFraming(projectId));
    } else {
      toast.success(t.done);
      router.refresh();
    }
  }

  // Nothing to click: the recording has just been sent, go on.
  useEffect(() => {
    const waiting = status === "uploaded" || status === "transcribed";
    if (!canEdit || started.current || !waiting) return;
    started.current = true;
    void run();
    // Runs once per mount; run() reads the props of that render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!runningElsewhere) return;
    const timer = window.setInterval(() => router.refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [runningElsewhere, router]);

  const transcribing =
    phase === "transcribing" || (runningElsewhere && status === "transcribing");
  const extracting =
    phase === "extracting" || (runningElsewhere && status === "extracting");
  const transcribed = hasTranscript || phase === "extracting";
  const state = (done: boolean, active: boolean): StepState =>
    done ? "done" : active ? "active" : "waiting";

  return (
    <div className="grid gap-4">
      <ProcessingSteps
        label={t.title}
        doneLabel={t.stepDone}
        steps={[
          { key: "audio", label: t.steps.audio, state: "done" },
          {
            key: "transcript",
            label: t.steps.transcript,
            state: state(transcribed, transcribing),
          },
          {
            key: "report",
            label: t.steps.report,
            state: state(false, extracting),
          },
          ...(projectId
            ? [
                {
                  key: "brief",
                  label: t.steps.brief,
                  state: "waiting" as const,
                },
              ]
            : []),
        ]}
      />
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {failed ? null : projectId ? t.hint : t.meetingHint}
      </p>
      {failed && (
        <div className="grid gap-3">
          <p role="alert" className="text-sm text-destructive">
            {errorText(error ?? errorCode)}
          </p>
          {canEdit && (
            <Button onClick={() => void run()} className="justify-self-start">
              {t.retry}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

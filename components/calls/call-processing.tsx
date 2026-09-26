"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionResult, CallStatus } from "@/lib/calls/constants";
import { fr } from "@/lib/i18n/fr";

type ErrorKey = keyof typeof fr.calls.errors;
type Phase = "transcribing" | "extracting";

async function post(callId: string, step: "transcribe" | "extract") {
  try {
    const response = await fetch(`/api/calls/${callId}/${step}`, {
      method: "POST",
    });
    return (await response.json()) as ActionResult;
  } catch {
    return { ok: false, error: "network" } as const;
  }
}

const errorText = (code: string | null) =>
  code ? (fr.calls.errors[code as ErrorKey] ?? fr.calls.errors.unknown) : null;

/**
 * Transcribe then extract. Both steps persist their status server-side, so a
 * reload shows where the call stands; this component only drives them.
 */
export function CallProcessing({
  callId,
  status,
  errorCode,
  hasTranscript,
  hasReport,
}: {
  callId: string;
  status: CallStatus;
  errorCode: string | null;
  hasTranscript: boolean;
  hasReport: boolean;
}) {
  const t = fr.calls.process;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runningElsewhere =
    phase === null && (status === "transcribing" || status === "extracting");

  async function run(fromTranscription: boolean) {
    setError(null);
    if (fromTranscription) {
      setPhase("transcribing");
      const transcribed = await post(callId, "transcribe");
      router.refresh();
      if (!transcribed.ok) {
        setPhase(null);
        return setError(transcribed.error);
      }
    }
    setPhase("extracting");
    const extracted = await post(callId, "extract");
    setPhase(null);
    router.refresh();
    if (!extracted.ok) return setError(extracted.error);
    toast.success(t.done);
  }

  const shown = error ?? (status === "failed" ? errorCode : null);
  const busy = phase !== null || runningElsewhere;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {!hasTranscript ? (
          <Button
            onClick={() => run(true)}
            disabled={busy}
            className="h-10 px-4"
          >
            {phase === "transcribing"
              ? t.transcribing
              : phase === "extracting"
                ? t.extracting
                : status === "failed"
                  ? t.retry
                  : t.run}
          </Button>
        ) : (
          <Button
            onClick={() => run(false)}
            disabled={busy}
            variant={hasReport ? "outline" : "default"}
            className="h-10 px-4"
          >
            {phase === "extracting" ? t.extracting : t.rerunExtraction}
          </Button>
        )}
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {busy ? (runningElsewhere ? t.busy : t.hint) : null}
      </p>
      {shown && !busy && (
        <p role="alert" className="text-sm text-destructive">
          {errorText(shown)}
        </p>
      )}
    </div>
  );
}

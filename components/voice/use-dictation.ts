"use client";

import { useEffect, useRef, useState } from "react";

import {
  useRecorder,
  type RecorderError,
  type Recording,
} from "@/components/calls/use-recorder";
import {
  MAX_DICTATION_SECONDS,
  type DictationResponse,
  type VoiceErrorCode,
  type VoiceStage,
} from "@/lib/voice/constants";

/**
 * Dictation of a stage form: records the microphone, sends it to
 * /api/voice/[stage] and holds the proposals until the user reviews them.
 * The proposals live in memory only: nothing is stored before "Apply".
 */

export type DictationPhase<P> =
  | { name: "idle" }
  | { name: "requesting" }
  | { name: "recording" }
  | { name: "sending" }
  | { name: "review"; heard: string; proposals: P[] }
  | { name: "error"; error: VoiceErrorCode | RecorderError };

export function useDictation<P>(stage: VoiceStage, projectId: string) {
  const meter = useRef<HTMLSpanElement>(null);
  const [result, setResult] = useState<DictationPhase<P> | null>(null);
  // Cancelled: the recording the recorder hands over is dropped, not sent.
  const cancelled = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function send(recording: Recording) {
    setResult({ name: "sending" });
    const body = new FormData();
    body.set("projectId", projectId);
    body.set(
      "audio",
      new File([recording.blob], `dictee.${recording.ext}`, {
        type: recording.mime,
      }),
    );
    const answer: DictationResponse<P> = await fetch(`/api/voice/${stage}`, {
      method: "POST",
      body,
    })
      .then((response) => response.json())
      .catch(() => ({ ok: false, error: "provider_error" }));
    if (!mounted.current) return;
    setResult(
      answer.ok
        ? { name: "review", heard: answer.heard, proposals: answer.proposals }
        : { name: "error", error: answer.error },
    );
  }

  const rec = useRecorder(
    (level) =>
      meter.current?.style.setProperty("transform", `scaleX(${level})`),
    (recording) => {
      if (!cancelled.current) void send(recording);
    },
  );

  // The limit is part of the design: a dictation is a few sentences, not a call.
  const { elapsed, status, stop } = rec;
  useEffect(() => {
    if (status === "recording" && elapsed >= MAX_DICTATION_SECONDS) stop();
  }, [elapsed, status, stop]);

  const phase: DictationPhase<P> = rec.error
    ? { name: "error", error: rec.error }
    : status === "requesting"
      ? { name: "requesting" }
      : status === "recording"
        ? { name: "recording" }
        : (result ?? { name: "idle" });

  // Leaving the page would lose what was said or proposed.
  const unsaved = phase.name !== "idle" && phase.name !== "error";
  useEffect(() => {
    if (!unsaved) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [unsaved]);

  return {
    phase,
    elapsed,
    meter,
    start() {
      cancelled.current = false;
      setResult(null);
      void rec.start("mic");
    },
    finish: stop,
    cancel() {
      cancelled.current = true;
      stop();
    },
    /** Back to the idle button, after applying or abandoning. */
    reset() {
      setResult(null);
      rec.discard();
    },
  };
}

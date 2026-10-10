"use client";

import { useEffect, useRef, useState } from "react";

import {
  useRecorder,
  type RecorderError,
  type Recording,
} from "@/components/calls/use-recorder";
import { useAudioMeter } from "@/components/ui/use-audio-meter";
import {
  MAX_DICTATION_SECONDS,
  type VoiceErrorCode,
} from "@/lib/voice/constants";

/**
 * Voice typing: records the microphone, sends it to /api/voice/transcribe and
 * hands the text to `onText`, which puts it in the input. Nothing is sent to
 * the assistant: the user reads the text first.
 */

export type VoiceInputPhase =
  "idle" | "requesting" | "recording" | "transcribing";

type Answer = { ok: true; text: string } | { ok: false; error: VoiceErrorCode };

export function useVoiceInput(onText: (text: string) => void) {
  const meter = useAudioMeter();
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<VoiceErrorCode | null>(null);
  const cancelled = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function send(recording: Recording) {
    setTranscribing(true);
    const body = new FormData();
    body.set(
      "audio",
      new File([recording.blob], `dictee.${recording.ext}`, {
        type: recording.mime,
      }),
    );
    const answer: Answer = await fetch("/api/voice/transcribe", {
      method: "POST",
      body,
    })
      .then((response) => response.json())
      .catch(() => ({ ok: false, error: "provider_error" }));
    if (!mounted.current) return;
    setTranscribing(false);
    if (answer.ok) onText(answer.text);
    else setError(answer.error);
  }

  const rec = useRecorder(meter.push, (recording) => {
    if (cancelled.current) return;
    // A dictation of several seconds in which nothing was heard is not sent:
    // Whisper would invent a text, and Espace Espace would send it to PO.
    if (recording.durationSeconds >= 4 && recording.heardSeconds === 0) {
      setError("nothing_heard");
      return;
    }
    void send(recording);
  });

  const { elapsed, status, stop } = rec;
  useEffect(() => {
    if (status === "recording" && elapsed >= MAX_DICTATION_SECONDS) stop();
  }, [elapsed, status, stop]);

  const phase: VoiceInputPhase = transcribing
    ? "transcribing"
    : status === "requesting" || status === "recording"
      ? status
      : "idle";

  function cancel() {
    cancelled.current = true;
    stop();
  }

  // Escape drops the dictation, wherever the focus is.
  const recording = phase === "recording";
  useEffect(() => {
    if (!recording) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      cancelled.current = true;
      stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recording, stop]);

  return {
    phase,
    elapsed,
    meter: meter.ref,
    error: (error ?? rec.error) satisfies VoiceErrorCode | RecorderError | null,
    /** Starts listening, or stops and transcribes. */
    toggle() {
      if (phase === "recording") return stop();
      if (phase !== "idle") return;
      cancelled.current = false;
      setError(null);
      void rec.start("mic");
    },
    cancel,
  };
}

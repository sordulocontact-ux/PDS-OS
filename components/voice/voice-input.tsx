"use client";

import { IconCheck, IconMicrophone, IconXmark } from "nucleo-sharp-essential";
import { useSyncExternalStore, type Ref } from "react";

import { isRecordingSupported } from "@/components/calls/recorder-media";
import type { RecorderError } from "@/components/calls/use-recorder";
import type { VoiceInputPhase } from "@/components/voice/use-voice-input";
import { AudioMeter } from "@/components/ui/audio-meter";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import {
  MAX_DICTATION_SECONDS,
  type VoiceErrorCode,
} from "@/lib/voice/constants";

/**
 * Voice typing controls for a text input: the microphone button next to the
 * send button, the listening bar that replaces both, and the status line
 * above the input.
 */

const noSubscribe = () => () => {};

export function VoiceInputButton({
  phase,
  onToggle,
  disabled,
  startLabel = fr.voice.input.start,
}: {
  phase: VoiceInputPhase;
  onToggle: () => void;
  disabled?: boolean;
  // What the microphone does at rest, for a screen reader.
  startLabel?: string;
}) {
  const t = fr.voice.input;
  // Browser capability, read without a server/client mismatch.
  const supported = useSyncExternalStore(
    noSubscribe,
    () => isRecordingSupported("mic"),
    () => true,
  );
  const listening = phase === "recording";
  return (
    <Button
      type="button"
      size="icon-sm"
      // Filled while listening: the state reads without color (DESIGN.md § 1).
      variant={listening ? "default" : "outline"}
      aria-label={listening ? t.stop : startLabel}
      aria-pressed={listening}
      title={supported ? undefined : fr.voice.unsupported}
      disabled={
        !supported ||
        disabled ||
        phase === "requesting" ||
        phase === "transcribing"
      }
      onClick={onToggle}
      // White square with a hairline at rest (Figma "Desktop - 11").
      className={cn(
        "shrink-0",
        !listening && "border-[color:var(--border-hairline)]",
      )}
    >
      <IconMicrophone aria-hidden className="size-5" />
    </Button>
  );
}

export function VoiceInputStatus({
  phase,
  error,
}: {
  phase: VoiceInputPhase;
  error: VoiceErrorCode | RecorderError | null;
}) {
  const t = fr.voice;
  if (error)
    return (
      <p role="alert" className="text-sm">
        {t.errors[error]}
      </p>
    );
  // While listening, the waveform in the input says it all (VoiceInputBar).
  if (phase !== "transcribing") return null;
  return (
    <p className="text-sm text-muted-foreground" aria-live="polite">
      {t.input.transcribing}
    </p>
  );
}

/**
 * While listening, in place of the microphone and send buttons (as in
 * Claude): the scrolling waveform, the clock, cancel and validate.
 */
export function VoiceInputBar({
  phase,
  elapsed,
  meterRef,
  onCancel,
  onFinish,
}: {
  phase: VoiceInputPhase;
  elapsed: number;
  meterRef: Ref<HTMLSpanElement>;
  onCancel: () => void;
  onFinish: () => void;
}) {
  const t = fr.voice;
  // The microphone is not open yet: nothing to cancel or validate.
  const waiting = phase === "requesting";
  return (
    <div
      className="flex min-w-0 grow animate-in items-center gap-3 duration-[var(--duration-base)] ease-[var(--ease-out)] fade-in-0"
      aria-live="polite"
    >
      <span className="sr-only">{waiting ? t.requesting : t.recording}</span>
      <AudioMeter ref={meterRef} label={t.level} size="sm" className="grow" />
      <span
        className="shrink-0 text-xs text-muted-foreground tabular-nums"
        title={t.limit(formatClock(MAX_DICTATION_SECONDS))}
      >
        {formatClock(elapsed)}
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        aria-label={t.input.cancel}
        disabled={waiting}
        onClick={onCancel}
        className="shrink-0 animate-in border-[color:var(--border-hairline)] duration-[var(--duration-base)] ease-[var(--ease-out)] fade-in-0 zoom-in-90"
      >
        <IconXmark aria-hidden className="size-5" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        aria-label={t.input.stop}
        disabled={waiting}
        onClick={onFinish}
        className="shrink-0 animate-in duration-[var(--duration-base)] ease-[var(--ease-out)] fade-in-0 zoom-in-90"
      >
        <IconCheck aria-hidden className="size-5" />
      </Button>
    </div>
  );
}

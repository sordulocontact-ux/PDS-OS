"use client";

import { IconMicrophone } from "nucleo-sharp-essential";
import { useSyncExternalStore, type Ref } from "react";

import { isRecordingSupported } from "@/components/calls/recorder-media";
import type { RecorderError } from "@/components/calls/use-recorder";
import type { VoiceInputPhase } from "@/components/voice/use-voice-input";
import { AudioMeter } from "@/components/ui/audio-meter";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatClock } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import {
  MAX_DICTATION_SECONDS,
  type VoiceErrorCode,
} from "@/lib/voice/constants";

/**
 * Voice typing controls for a text input: the microphone button, next to the
 * send button, and the status line above the input.
 */

const noSubscribe = () => () => {};

export function VoiceInputButton({
  phase,
  onToggle,
  disabled,
}: {
  phase: VoiceInputPhase;
  onToggle: () => void;
  disabled?: boolean;
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
      aria-label={listening ? t.stop : t.start}
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
  elapsed,
  meterRef,
}: {
  phase: VoiceInputPhase;
  error: VoiceErrorCode | RecorderError | null;
  elapsed: number;
  meterRef: Ref<HTMLSpanElement>;
}) {
  const t = fr.voice;
  if (error)
    return (
      <p role="alert" className="text-sm">
        {t.errors[error]}
      </p>
    );

  switch (phase) {
    case "idle":
      return null;
    case "requesting":
      return (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t.requesting}
        </p>
      );
    case "transcribing":
      return (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t.input.transcribing}
        </p>
      );
    case "recording":
      return (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge tone="info" dot>
              {t.recording}
            </StatusBadge>
            <span className="text-xs text-muted-foreground tabular-nums">
              <span className="text-foreground">{formatClock(elapsed)}</span>{" "}
              {t.limit(formatClock(MAX_DICTATION_SECONDS))} · {t.input.escape}
            </span>
          </div>
          {/* Live input level: bars moved by useAudioMeter, no re-render. */}
          <AudioMeter ref={meterRef} label={t.level} size="sm" />
        </div>
      );
  }
}

import type { Ref } from "react";

import { AudioMeter } from "@/components/ui/audio-meter";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatClock } from "@/lib/calls/format";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/** While recording: state, clock, input level, pause and stop. */
export function RecordingLive({
  paused,
  elapsed,
  fromTab,
  tabSilent,
  micSilent,
  onKeepRecording,
  meterRef,
  onPauseToggle,
  onStop,
  savedMs,
  unsavedMs,
  failing,
}: {
  paused: boolean;
  elapsed: number;
  /** Recording a shared tab: remind that hanging up does not stop it. */
  fromTab: boolean;
  tabSilent: boolean;
  // Nothing heard at all for 30 s (microphone and tab).
  micSilent: boolean;
  onKeepRecording: () => void;
  meterRef: Ref<HTMLSpanElement>;
  onPauseToggle: () => void;
  onStop: () => void;
  // This take: confirmed saved, and recorded but not saved yet (PROJ-BUG-01).
  savedMs: number;
  unsavedMs: number;
  failing: boolean;
}) {
  const t = fr.calls.recorder;
  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge tone={paused ? "warning" : "info"} dot>
          {paused ? t.paused : t.recording}
        </StatusBadge>
        <span className="font-heading text-figure-xl tabular-nums">
          {formatClock(elapsed)}
        </span>
      </div>
      {/* Live input level: bars moved by useAudioMeter, no re-render. */}
      <AudioMeter ref={meterRef} label={t.level} />
      {micSilent && !tabSilent && (
        <p
          role="status"
          className="text-sm text-[color:var(--tone-warning-fg)]"
        >
          {t.micSilent}
        </p>
      )}
      {tabSilent ? (
        // Inline, not a toast (docs/DESIGN.md § 8). While it is up it holds the
        // only actions, so "Stop" is never shown twice.
        <div
          role="alert"
          className="grid gap-2 rounded-lg border border-[color:var(--border-strong)] p-3"
        >
          <p className="text-sm">
            <span className="font-medium">{t.silenceTitle}</span>{" "}
            {t.silenceBody}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onStop}>{t.silenceStop}</Button>
            <Button variant="ghost" onClick={onKeepRecording}>
              {t.silenceContinue}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onPauseToggle}>
            {paused ? t.resume : t.pause}
          </Button>
          <Button onClick={onStop}>{t.stop}</Button>
        </div>
      )}
      {fromTab && <p className="text-sm">{t.endReminder}</p>}
      <SaveState savedMs={savedMs} unsavedMs={unsavedMs} failing={failing} />
    </div>
  );
}

/** What is saved, never more: a piece counts once the server has it. */
export function SaveState({
  savedMs,
  unsavedMs,
  failing,
}: {
  savedMs: number;
  unsavedMs: number;
  failing: boolean;
}) {
  const t = fr.calls.recorder;
  if (failing)
    return (
      <p role="alert" className="text-sm text-[color:var(--tone-warning-fg)]">
        {t.saveFailing}
      </p>
    );
  return (
    <p className="text-xs text-muted-foreground tabular-nums">
      {t.savedLive(formatClock(savedMs / 1000))}
      {unsavedMs > 0 && ` · ${t.pendingLive(formatClock(unsavedMs / 1000))}`}
      {" · "}
      {t.keepOpen}
    </p>
  );
}

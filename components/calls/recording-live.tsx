import type { Ref } from "react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatClock } from "@/lib/calls/format";
import { fr } from "@/lib/i18n/fr";

/** While recording: state, clock, input level, pause and stop. */
export function RecordingLive({
  paused,
  elapsed,
  fromTab,
  tabSilent,
  onKeepRecording,
  meterRef,
  onPauseToggle,
  onStop,
}: {
  paused: boolean;
  elapsed: number;
  /** Recording a shared tab: remind that hanging up does not stop it. */
  fromTab: boolean;
  tabSilent: boolean;
  onKeepRecording: () => void;
  meterRef: Ref<HTMLSpanElement>;
  onPauseToggle: () => void;
  onStop: () => void;
}) {
  const t = fr.calls.recorder;
  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge treatment={paused ? "pending" : "normal"} dot>
          {paused ? t.paused : t.recording}
        </StatusBadge>
        <span className="font-heading text-figure-xl tabular-nums">
          {formatClock(elapsed)}
        </span>
      </div>
      {/* Live input level: proof the sound is captured. Written by the hook, no re-render. */}
      <span
        className="relative block h-[3px] overflow-hidden rounded-pill bg-[var(--meter-track)]"
        aria-hidden
        title={t.level}
      >
        <span
          ref={meterRef}
          className="absolute inset-0 origin-left scale-x-0 bg-[var(--po-ink-900)]"
        />
      </span>
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
      <p className="text-xs text-muted-foreground">{t.keepOpen}</p>
    </div>
  );
}

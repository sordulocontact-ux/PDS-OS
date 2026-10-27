"use client";

import { useState, type ReactNode } from "react";

import type { RecorderInterruption } from "@/components/calls/use-recorder";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatClock, formatTime } from "@/lib/calls/format";
import {
  filledTakes,
  lastSavedAt,
  recordingGaps,
  savedMs,
  type SavedTake,
} from "@/lib/calls/recording";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

/**
 * A recording that stopped without « Arrêter » (PROJ-BUG-01): a reload, a
 * closed tab, a microphone lost or withdrawn. Says what is saved, what is
 * missing and what is still being saved, then what can follow: record the
 * rest, send what is saved, import a file, or delete.
 */
export function RecordingRecovery({
  takes,
  interruption,
  unsavedMs,
  failing,
  starting,
  sendingLabel,
  error,
  onResume,
  onSend,
  onDiscard,
  alternative,
}: {
  takes: SavedTake[];
  interruption: RecorderInterruption | null;
  // Recorded before the interruption, not confirmed saved yet.
  unsavedMs: number;
  failing: boolean;
  starting: boolean;
  // While sending: what is happening (saving the rest, then sending).
  sendingLabel: string | null;
  // The last attempt's error (microphone, send), already worded.
  error: string | null;
  onResume: () => void;
  onSend: () => void;
  onDiscard: () => void;
  alternative?: ReactNode;
}) {
  const t = fr.calls.recorder;
  const r = t.recovery;
  const [confirming, setConfirming] = useState(false);
  const saved = savedMs(takes);
  const until = lastSavedAt(takes);
  const parts = filledTakes(takes).length;
  const busy = starting || sendingLabel !== null;

  return (
    <div className="grid gap-4">
      <ToneCallout tone="warning" role="status">
        <span className="font-semibold">{r.title}.</span>{" "}
        {interruption && t.interruptions[interruption]}
      </ToneCallout>

      <div className="grid gap-1 text-sm">
        <p>
          {saved > 0 && until
            ? r.saved(formatClock(saved / 1000), formatTime(until))
            : r.nothingSaved}
        </p>
        {unsavedMs > 0 && (
          <p className="text-muted-foreground">
            {failing
              ? t.saveFailing
              : t.pendingLive(formatClock(unsavedMs / 1000))}
          </p>
        )}
        {parts > 1 && <p className="text-muted-foreground">{r.parts(parts)}</p>}
      </div>

      <GapList takes={takes} />

      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{r.confirmDiscard}</span>
          <Button variant="outline" onClick={onDiscard} disabled={busy}>
            {t.confirmDiscardAction}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            {t.cancel}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={onResume} disabled={busy}>
            {starting ? t.starting : saved > 0 ? r.resume : r.retry}
          </Button>
          {(saved > 0 || unsavedMs > 0) && (
            <Button variant="outline" onClick={onSend} disabled={busy}>
              {sendingLabel ?? r.sendSaved}
            </Button>
          )}
          {saved > 0 && (
            <Button
              variant="ghost"
              onClick={() => setConfirming(true)}
              disabled={busy}
            >
              {r.discard}
            </Button>
          )}
        </div>
      )}
      {alternative}
    </div>
  );
}

/** Audio missing between two takes, said with its times. */
export function GapList({ takes }: { takes: SavedTake[] }) {
  const r = fr.calls.recorder.recovery;
  const gaps = recordingGaps(takes);
  if (gaps.length === 0) return null;
  return (
    <div className="grid gap-1 text-sm">
      <p className="font-medium">{r.gapsTitle}</p>
      <ul className="grid gap-1 text-muted-foreground">
        {gaps.map((gap) => (
          <li key={gap.from}>
            {r.gap(
              formatTime(gap.from),
              formatTime(gap.to),
              Math.max(1, Math.round(gap.ms / 60_000)),
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

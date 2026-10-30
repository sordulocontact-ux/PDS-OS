"use client";

import { useState } from "react";

import { SaveState } from "@/components/calls/recording-live";
import { GapList } from "@/components/calls/recording-recovery";
import { QUIET_RATIO, type Recording } from "@/components/calls/use-recorder";
import { MetaList } from "@/components/labo/meta-list";
import { useCanEditProject } from "@/components/projects/edit-access";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Button } from "@/components/ui/button";
import { useObjectUrl } from "@/components/ui/use-object-url";
import { formatClock, formatMegabytes } from "@/lib/calls/format";
import { filledTakes, savedMs, type SavedTake } from "@/lib/calls/recording";
import type { CallErrorCode } from "@/lib/calls/constants";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

const FREE_TIER_BYTES = 25 * 1024 * 1024;

/** After stopping: listen back, then send. Discarding asks for confirmation first. */
export function RecordingReview({
  recording,
  sendError,
  onSend,
  onDiscard,
  takes,
  unsavedMs,
  failing,
  sendingLabel,
}: {
  recording: Recording;
  // Every take of the call (earlier ones from before a reload included).
  takes: SavedTake[];
  unsavedMs: number;
  failing: boolean;
  // While sending: saving the last seconds, then sending.
  sendingLabel: string | null;
  sendError: CallErrorCode | null;
  onSend: () => void;
  onDiscard: () => void;
}) {
  const t = fr.calls.recorder;
  const sending = sendingLabel !== null;
  const [confirming, setConfirming] = useState(false);
  const canEdit = useCanEditProject();
  const url = useObjectUrl(recording.blob) ?? undefined;
  // Almost nothing heard: said before sending, never sent unawares.
  const quiet =
    recording.durationSeconds >= 10 &&
    recording.heardSeconds / recording.durationSeconds < QUIET_RATIO;

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <p className="text-sm">{t.review}</p>
      {url && (
        <AudioPlayer
          src={url}
          label={t.listen}
          duration={recording.durationSeconds}
        />
      )}
      <MetaList
        items={[
          [t.duration, formatClock(recording.durationSeconds)],
          [t.size, `${formatMegabytes(recording.blob.size)} Mo`],
        ]}
      />
      {(unsavedMs > 0 || failing) && (
        <SaveState
          savedMs={savedMs(takes)}
          unsavedMs={unsavedMs}
          failing={failing}
        />
      )}
      {filledTakes(takes).length > 1 && (
        <p className="text-sm text-muted-foreground">
          {t.recovery.parts(filledTakes(takes).length)}
        </p>
      )}
      <GapList takes={takes} />
      {quiet && (
        <p role="alert" className="text-sm text-[color:var(--tone-warning-fg)]">
          {t.quiet}
        </p>
      )}
      {recording.blob.size > FREE_TIER_BYTES && (
        <p className="text-xs text-muted-foreground">{t.freeTierNote}</p>
      )}
      {sendError && (
        <p role="alert" className="text-sm text-error">
          {fr.calls.errors[sendError]}
        </p>
      )}
      {!canEdit ? null : confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{t.confirmDiscard}</span>
          <Button variant="outline" onClick={onDiscard}>
            {t.confirmDiscardAction}
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            {t.cancel}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={quiet ? "outline" : "default"}
            onClick={onSend}
            disabled={sending}
          >
            {sendingLabel ?? (quiet ? t.sendAnyway : t.send)}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setConfirming(true)}
            disabled={sending}
          >
            {t.discard}
          </Button>
        </div>
      )}
    </div>
  );
}

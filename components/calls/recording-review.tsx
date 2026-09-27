"use client";

import { useState } from "react";

import type { Recording } from "@/components/calls/use-recorder";
import { MetaList } from "@/components/labo/meta-list";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { useObjectUrl } from "@/components/ui/use-object-url";
import { formatClock, formatMegabytes } from "@/lib/calls/format";
import type { UploadError } from "@/lib/calls/upload-audio";
import { fr } from "@/lib/i18n/fr";

const FREE_TIER_BYTES = 25 * 1024 * 1024;

/** After stopping: listen back, then send. Discarding asks for confirmation first. */
export function RecordingReview({
  recording,
  sending,
  sendError,
  onSend,
  onDiscard,
}: {
  recording: Recording;
  sending: boolean;
  sendError: UploadError | null;
  onSend: () => void;
  onDiscard: () => void;
}) {
  const t = fr.calls.recorder;
  const [confirming, setConfirming] = useState(false);
  const canEdit = useCanEditProject();
  const url = useObjectUrl(recording.blob) ?? undefined;

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <p className="text-sm">{t.review}</p>
      <audio controls src={url} className="w-full">
        <track kind="captions" />
      </audio>
      <MetaList
        items={[
          [t.duration, formatClock(recording.durationSeconds)],
          [t.size, `${formatMegabytes(recording.blob.size)} Mo`],
        ]}
      />
      {recording.blob.size > FREE_TIER_BYTES && (
        <p className="text-xs text-muted-foreground">{t.freeTierNote}</p>
      )}
      {sendError && (
        <p role="alert" className="text-sm text-destructive">
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
          <Button onClick={onSend} disabled={sending}>
            {sending ? t.sending : t.send}
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
      <p className="text-xs text-muted-foreground">{t.keepOpen}</p>
    </div>
  );
}

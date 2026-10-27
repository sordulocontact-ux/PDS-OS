"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionDirection } from "@/lib/i18n/fr/production-direction";
import {
  decideDirection,
  submitDirection,
} from "@/lib/production/direction-actions";
import type { DirectionStatus } from "@/lib/production/organization";

const fr = { productionDirection };

const t = fr.productionDirection;
const TONE = {
  draft: "neutral",
  submitted: "action",
  approved: "success",
  changes: "warning",
} as const;

/**
 * The life of the director's proposal under its brief: « Envoyer » by whoever
 * writes it, then « Valider » or « Demander des modifications » (with a
 * comment) by the creative side — each person sees the action that is theirs.
 */
export function DirectionDecision({
  projectId,
  sheetId,
  status,
  comment,
  decided,
  canSubmit,
  canDecide,
  directorByLink,
  reviewerName,
}: {
  projectId: string;
  sheetId: string;
  status: DirectionStatus;
  comment: string | null;
  decided: { by: string | null; on: string | null };
  canSubmit: boolean;
  canDecide: boolean;
  directorByLink: string | null;
  reviewerName: string;
}) {
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);
  const submit = useWriteSubmit(() => undefined, t.submitted);
  const approve = useWriteSubmit(() => undefined, t.approvedToast);
  const changes = useWriteSubmit(() => undefined, t.changesToast);
  const error = submit.error ?? approve.error ?? changes.error;
  const pending = submit.pending || approve.pending || changes.pending;
  return (
    <section
      aria-labelledby="direction-decision"
      className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-hairline)] bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="direction-decision" className="text-body-md font-semibold">
          {t.title}
        </h3>
        <StatusBadge tone={TONE[status]}>{t.status[status]}</StatusBadge>
      </div>
      {status === "changes" && comment && (
        <ToneCallout tone="warning">
          {t.changes(decided.by ?? "—", comment)}
        </ToneCallout>
      )}
      {status === "approved" && (
        <ToneCallout tone="success">
          {t.approved(decided.by ?? "—", decided.on ?? "")}
        </ToneCallout>
      )}
      {(status === "draft" || status === "changes") &&
        (directorByLink ? (
          <p className="text-sm text-muted-foreground">
            {t.byLink(directorByLink)}
          </p>
        ) : null)}
      {(status === "draft" || status === "changes") && canSubmit && (
        <div>
          <Button
            type="button"
            disabled={pending}
            aria-busy={submit.pending || undefined}
            onClick={() =>
              submit.run(() => submitDirection({ projectId, sheetId }))
            }
          >
            {t.submit}
          </Button>
        </div>
      )}
      {status === "submitted" &&
        (canDecide ? (
          <>
            <TextareaField
              name="comment"
              label={t.comment}
              placeholder={t.commentPlaceholder}
              rows={2}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              error={missing ? t.commentRequired : undefined}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={pending}
                aria-busy={approve.pending || undefined}
                onClick={() =>
                  approve.run(() =>
                    decideDirection({
                      projectId,
                      sheetId,
                      approve: true,
                      comment: "",
                    }),
                  )
                }
              >
                {t.approve}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                aria-busy={changes.pending || undefined}
                onClick={() => {
                  setMissing(!note.trim());
                  if (!note.trim()) return;
                  changes.run(() =>
                    decideDirection({
                      projectId,
                      sheetId,
                      approve: false,
                      comment: note,
                    }),
                  );
                }}
              >
                {t.askChanges}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.wait(reviewerName)}
          </p>
        ))}
      {error && <FormMessage kind="error">{error}</FormMessage>}
    </section>
  );
}

"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  reviewDesignVersion,
  withdrawDesignVersion,
} from "@/lib/design/actions";
import { fr } from "@/lib/i18n/fr";

/**
 * What can be done on a creative proposal (MKT-C2-10): the owner approves
 * the concept, asks for changes — a comment, and a precise zone if any; the
 * author's retouche task follows —, or sets it aside with a reason; its
 * author withdraws it before review.
 */
export function VersionActions({
  projectId,
  versionId,
  number,
  canReview,
  canDiscard = canReview,
  canWithdraw,
}: {
  projectId: string;
  versionId: string;
  number: number;
  canReview: boolean;
  // Setting aside also applies to a proposal sent back for changes.
  canDiscard?: boolean;
  canWithdraw: boolean;
}) {
  const t = fr.design;
  const { pending, run } = useFramingAction();
  const [mode, setMode] = useState<"changes" | "discard" | null>(null);
  const [comment, setComment] = useState("");
  const [scope, setScope] = useState("");
  // Withdrawing deletes the file: a second click confirms it.
  const [confirming, setConfirming] = useState(false);
  const inputId = `review-${versionId}`;

  if (mode)
    return (
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () =>
              reviewDesignVersion(
                projectId,
                versionId,
                mode === "changes" ? "changes_requested" : "discarded",
                comment,
                mode === "changes" ? scope : "",
              ),
            () => setMode(null),
          );
        }}
      >
        <Label htmlFor={inputId} required>
          {mode === "changes" ? t.review.commentLabel : t.review.discardLabel}
        </Label>
        <Textarea
          id={inputId}
          aria-required="true"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={
            mode === "changes"
              ? t.review.commentPlaceholder
              : t.review.discardPlaceholder
          }
          maxLength={1000}
          rows={3}
          autoFocus
        />
        {mode === "changes" && (
          <>
            <Label htmlFor={`${inputId}-scope`}>{t.review.scopeLabel}</Label>
            <Input
              id={`${inputId}-scope`}
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder={t.review.scopePlaceholder}
              maxLength={500}
            />
            <p className="text-caption text-muted-foreground">
              {t.review.taskNote}
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={pending || comment.trim() === ""}
          >
            {mode === "changes" ? t.review.send : t.review.discard}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setMode(null)}
          >
            {t.review.cancel}
          </Button>
        </div>
      </form>
    );

  return (
    <div className="flex flex-wrap gap-2">
      {canReview && (
        <>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() =>
                reviewDesignVersion(projectId, versionId, "approved", ""),
              )
            }
          >
            {t.review.approve}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setMode("changes")}
          >
            {t.review.requestChanges}
          </Button>
        </>
      )}
      {canDiscard && (
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setMode("discard")}
        >
          {t.review.discardOpen}
        </Button>
      )}
      {canWithdraw && (
        <Button
          size="sm"
          disabled={pending}
          variant={confirming ? "destructive" : "ghost"}
          aria-label={confirming ? undefined : t.version.withdrawLabel(number)}
          onClick={() =>
            confirming
              ? run(() => withdrawDesignVersion(projectId, versionId))
              : setConfirming(true)
          }
          onBlur={() => setConfirming(false)}
        >
          {confirming ? t.version.withdrawConfirm : t.version.withdraw}
        </Button>
      )}
    </div>
  );
}

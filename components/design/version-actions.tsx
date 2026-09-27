"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  reviewDesignVersion,
  withdrawDesignVersion,
} from "@/lib/design/actions";
import { fr } from "@/lib/i18n/fr";

/**
 * What can be done on the latest version: the owner approves it or asks for
 * changes (a comment is required), its author withdraws it before review.
 */
export function VersionActions({
  projectId,
  versionId,
  number,
  canReview,
  canWithdraw,
}: {
  projectId: string;
  versionId: string;
  number: number;
  canReview: boolean;
  canWithdraw: boolean;
}) {
  const t = fr.design;
  const { pending, run } = useFramingAction();
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  // Withdrawing deletes the file: a second click confirms it.
  const [confirming, setConfirming] = useState(false);
  const inputId = `changes-${versionId}`;

  if (asking)
    return (
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () => reviewDesignVersion(projectId, versionId, false, comment),
            () => setAsking(false),
          );
        }}
      >
        <Label htmlFor={inputId}>{t.review.commentLabel}</Label>
        <Textarea
          id={inputId}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.review.commentPlaceholder}
          maxLength={1000}
          rows={3}
          autoFocus
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={pending || comment.trim() === ""}
          >
            {t.review.send}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setAsking(false)}
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
              run(() => reviewDesignVersion(projectId, versionId, true, ""))
            }
          >
            {t.review.approve}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setAsking(true)}
          >
            {t.review.requestChanges}
          </Button>
        </>
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

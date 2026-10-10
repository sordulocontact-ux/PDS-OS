"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { decideStrategyDocument } from "@/lib/strategy/actions/documents";

/**
 * A reviewer's decision on a version: « Valider », or « Demander une
 * modification » with its reason (required, the database checks it too).
 */
export function DecisionForm({
  projectId,
  documentId,
}: {
  projectId: string;
  documentId: string;
}) {
  const t = fr.strategyDocuments.review;
  const { pending, run } = useFramingAction();
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  const decide = (approve: boolean) =>
    run(() => decideStrategyDocument(projectId, documentId, approve, comment));

  return (
    <div className="flex flex-col gap-3">
      <ToneCallout tone="action">{t.youDecide}</ToneCallout>
      <div className="grid gap-2">
        <Label htmlFor="decision-comment">{t.commentLabel}</Label>
        <Textarea
          id="decision-comment"
          rows={3}
          maxLength={2000}
          value={comment}
          aria-invalid={asking && comment.trim() === "" ? true : undefined}
          placeholder={asking ? t.commentRequired : undefined}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => decide(true)}>
          {t.approve}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (comment.trim() === "") return setAsking(true);
            decide(false);
          }}
        >
          {t.requestChanges}
        </Button>
      </div>
    </div>
  );
}

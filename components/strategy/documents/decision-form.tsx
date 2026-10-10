"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import { decideStrategyDocument } from "@/lib/strategy/actions/workflow";

/** A reviewer's decision: « Valider », or a change request with its reason. */
export function DecisionForm({
  projectId,
  documentId,
}: {
  projectId: string;
  documentId: string;
}) {
  const t = fr.strategyDocs.validation;
  const { pending, run } = useFramingAction();
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState("");
  const decide = (approve: boolean) =>
    run(() =>
      decideStrategyDocument({ projectId, documentId, approve, comment }),
    );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <ToneCallout tone="action">{t.youDecide}</ToneCallout>
      <div className="grid gap-2">
        <Label htmlFor="decision-comment">{t.commentLabel}</Label>
        <Textarea
          id="decision-comment"
          rows={3}
          maxLength={2000}
          value={comment}
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
          disabled={pending || (asking && comment.trim() === "")}
          onClick={() => {
            if (!asking || comment.trim() === "") return setAsking(true);
            decide(false);
          }}
        >
          {t.requestChanges}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { fr } from "@/lib/i18n/fr";
import { decideReport } from "@/lib/marketing/reports/approval-actions";
import {
  APPROVAL_DECISIONS,
  type ApprovalDecision,
} from "@/lib/marketing/reports/model";

const t = fr.marketingReview.approval.review;

/**
 * The validator's decision on one precise version (écran 3): approve the
 * provisional review, ask for corrections or postpone. The main button
 * names what it does — « … avec réserves » when the version has some — and
 * never suggests a closing or a final validation of the results.
 */
export function DecisionForm({
  projectId,
  reportId,
  version,
  hasReserves,
}: {
  projectId: string;
  reportId: string;
  version: number;
  hasReserves: boolean;
}) {
  const [decision, setDecision] = useState<ApprovalDecision>(
    "approved_provisional",
  );
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const needsComment = decision !== "approved_provisional";
  const label =
    decision === "approved_provisional"
      ? hasReserves
        ? t.approveWithReserves
        : t.approve
      : decision === "changes_requested"
        ? t.requestChanges
        : t.postpone;

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await decideReport({
            projectId,
            reportId,
            version,
            decision,
            comment,
          });
          if (!result.ok) return setError(result.error);
          toast.success(t.decided);
        });
      }}
    >
      <ChoiceCards
        name="decision"
        legend={t.decision}
        value={decision}
        onChange={setDecision}
        choices={APPROVAL_DECISIONS.map((d) => ({
          value: d,
          label: t.decisions[d],
          hint: t.hints[d],
        }))}
      />
      <TextareaField
        id={`decision-${reportId}-comment`}
        name="comment"
        label={t.comment}
        hint={needsComment ? t.commentRequired : t.commentOptional}
        aria-required={needsComment || undefined}
        rows={3}
        maxLength={2000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <Button
        type="submit"
        size="lg"
        variant={decision === "approved_provisional" ? "default" : "outline"}
        disabled={pending || (needsComment && comment.trim() === "")}
        aria-busy={pending || undefined}
      >
        {pending ? t.deciding : label}
      </Button>
    </form>
  );
}

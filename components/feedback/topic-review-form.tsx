"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { FormMessage } from "@/components/auth/form-message";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { reviewFeedbackTopic } from "@/lib/feedback/actions";
import {
  FEEDBACK_PRIORITIES,
  type FeedbackPriority,
  type TopicAction,
} from "@/lib/feedback/types";
import { feedback } from "@/lib/i18n/fr/feedback";

const fr = { feedback };

// Confirmation of a decision on a topic prepared by PO: the director checks
// it, picks or corrects the priority when there is one, and confirms. The
// decision is made by review_feedback_topic, with the director's session.
export function TopicReviewForm({
  topicId,
  action,
  priority: proposedPriority,
  onSaved,
  onCancel,
}: {
  topicId: string;
  action: TopicAction;
  priority: FeedbackPriority | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const t = fr.feedback;
  const needsPriority = action === "send" || action === "prioritize";
  const [priority, setPriority] = useState<FeedbackPriority | null>(
    proposedPriority,
  );
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Said at the source on the first try, never a disabled button.
    setMissing(needsPriority && !priority);
    if (needsPriority && !priority) return;
    startTransition(async () => {
      setError(null);
      const result = await reviewFeedbackTopic(
        topicId,
        action,
        priority ?? undefined,
      );
      if (!result.ok) {
        setError(t.actions.failed);
        return;
      }
      if (result.notion && result.notion.status !== "synced")
        toast.error(t.notion.failed(result.notion.reason), { duration: 15000 });
      onSaved();
    });
  };

  return (
    <form onSubmit={confirm} noValidate className="flex flex-col gap-5">
      {needsPriority && (
        <ChipChoice
          name="priority"
          legend={t.review.priority}
          required
          fill
          options={FEEDBACK_PRIORITIES.map((p) => ({
            value: p,
            label: t.priorities[p],
          }))}
          value={priority}
          onChange={(next) => {
            if (next) setPriority(next);
            setMissing(false);
          }}
          hint={priority ? t.review.priorityHints[priority] : undefined}
          error={missing ? t.review.priorityRequired : undefined}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.review.confirm[action]}
        onCancel={onCancel}
      />
    </form>
  );
}

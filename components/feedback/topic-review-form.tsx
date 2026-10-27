"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ChoiceCards } from "@/components/ui/choice-cards";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
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
  const [pending, startTransition] = useTransition();

  const confirm = () =>
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

  return (
    <div className="flex flex-col gap-5">
      {needsPriority && (
        <ChoiceCards
          name="priority"
          legend={t.review.priority}
          required
          choices={FEEDBACK_PRIORITIES.map((p) => ({
            value: p,
            label: t.priorities[p],
            hint: t.review.priorityHints[p],
          }))}
          value={priority ?? undefined}
          onChange={setPriority}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={pending || (needsPriority && !priority)}
          aria-busy={pending || undefined}
          onClick={confirm}
        >
          {t.review.confirm[action]}
        </Button>
      </div>
    </div>
  );
}

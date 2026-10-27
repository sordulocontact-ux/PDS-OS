"use client";

import type { SavedLink } from "@/components/assistant/draft-forms";
import { TopicEditForm } from "@/components/feedback/topic-edit-form";
import { TopicReviewForm } from "@/components/feedback/topic-review-form";
import type {
  FeedbackReviewDraft,
  FeedbackTopicDraft,
} from "@/lib/assistant/drafts";
import { routes } from "@/lib/auth/redirects";
import { feedback } from "@/lib/i18n/fr/feedback";

const fr = { feedback };

type FormProps<D> = {
  draft: D;
  onSaved: (saved: SavedLink) => void;
  onCancel: () => void;
};

const feedbackPage: SavedLink = {
  label: fr.feedback.title,
  href: routes.feedback,
};

// The director's real edit form, starting from PO's draft.
export function FeedbackTopicDraftForm({
  draft,
  onSaved,
  onCancel,
}: FormProps<FeedbackTopicDraft>) {
  return (
    <TopicEditForm
      topic={{
        id: draft.topicId,
        kind: draft.values.feedbackKind,
        title: draft.values.title,
        summary: draft.values.summary,
      }}
      onSaved={() => onSaved(feedbackPage)}
      onCancel={onCancel}
    />
  );
}

// The director confirms a decision prepared by PO.
export function FeedbackReviewDraftForm({
  draft,
  onSaved,
  onCancel,
}: FormProps<FeedbackReviewDraft>) {
  return (
    <TopicReviewForm
      topicId={draft.topicId}
      action={draft.action}
      priority={draft.priority}
      onSaved={() => onSaved(feedbackPage)}
      onCancel={onCancel}
    />
  );
}

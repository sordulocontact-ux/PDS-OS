"use client";

import { useState } from "react";

import { ArtistDraftFlow } from "@/components/assistant/artist-draft-flow";
import {
  FeedbackReviewDraftForm,
  FeedbackTopicDraftForm,
} from "@/components/assistant/feedback-draft-forms";
import {
  MasterDraftForm,
  ProjectDraftForm,
  type SavedLink,
} from "@/components/assistant/draft-forms";
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DraftProposal } from "@/lib/assistant/drafts";
import { fr } from "@/lib/i18n/fr";

// Inside the review panel, loaded only when a draft is opened
// (next/dynamic): the real form of the draft's kind, pre-filled.
export default function DraftSheetBody({
  proposal,
  onSaved,
  onCancel,
}: {
  proposal: DraftProposal;
  onSaved: (saved: SavedLink) => void;
  onCancel: () => void;
}) {
  const t = fr.assistant.drafts.sheet;
  const { draft } = proposal;
  const [description, setDescription] = useState<string>(t[draft.kind]);

  return (
    <>
      <SheetHeader className="px-5 pt-5 pr-14">
        <SheetTitle>{proposal.title}</SheetTitle>
        <SheetDescription>{description}</SheetDescription>
      </SheetHeader>
      <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {draft.kind === "artist" && (
          <ArtistDraftFlow
            draft={draft}
            onSaved={onSaved}
            onCancel={onCancel}
            onStep={setDescription}
          />
        )}
        {draft.kind === "master" && (
          <MasterDraftForm
            draft={draft}
            onSaved={onSaved}
            onCancel={onCancel}
          />
        )}
        {draft.kind === "project" && (
          <ProjectDraftForm
            draft={draft}
            onSaved={onSaved}
            onCancel={onCancel}
          />
        )}
        {draft.kind === "feedbackTopic" && (
          <FeedbackTopicDraftForm
            draft={draft}
            onSaved={onSaved}
            onCancel={onCancel}
          />
        )}
        {draft.kind === "feedbackReview" && (
          <FeedbackReviewDraftForm
            draft={draft}
            onSaved={onSaved}
            onCancel={onCancel}
          />
        )}
      </div>
    </>
  );
}

"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  decideContent,
  setFeedbackStatus,
} from "@/lib/activations/influence/content-actions";
import type { ActivationScope } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";

import { ReasonForm } from "@/components/ui/reason-form";
import { ContentForm } from "./content-form";
import { FeedbackForm } from "./feedback-form";

const t = fr.activationInfluence.contents;
const FEEDBACK_STATUSES = [
  "open",
  "sent_declared",
  "declared_fixed",
  "resolved",
  "dropped",
] as const;

export function AddContentButton(props: {
  scope: ActivationScope;
  targetId: string;
  nextLabel: string;
}) {
  return (
    <DialogButton
      label={t.add}
      icon={IconPlus}
      title={t.addTitle}
      description={t.addDescription}
    >
      {(close) => <ContentForm {...props} onDone={close} />}
    </DialogButton>
  );
}

/** The decision on one version, and adding a feedback to it. */
export function ContentDecisionButtons({
  projectId,
  contentId,
  decided,
  canDecide,
  canComment,
}: {
  projectId: string;
  contentId: string;
  decided: boolean;
  canDecide: boolean;
  canComment: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const approve = () =>
    startTransition(async () => {
      const r = await decideContent({
        projectId,
        contentId,
        decision: "approved",
        comment: "",
      });
      if (r.ok) toast.success(t.decided);
      else toast.error(r.error);
    });
  const reasoned = (
    decision: "changes_requested" | "refused",
    label: string,
  ) => (
    <DialogButton
      label={label}
      size="xs"
      variant="ghost"
      title={label}
      description={fr.activationWork.sheet.decisionDescription}
    >
      {(close) => (
        <ReasonForm
          label={t.comment}
          submitLabel={label}
          doneMessage={t.decided}
          run={(comment) =>
            decideContent({ projectId, contentId, decision, comment })
          }
          onDone={close}
        />
      )}
    </DialogButton>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {canDecide && !decided && (
        <>
          <Button type="button" size="xs" disabled={pending} onClick={approve}>
            {t.approve}
          </Button>
          {reasoned("changes_requested", t.requestChanges)}
          {reasoned("refused", t.refuse)}
        </>
      )}
      {canComment && (
        <DialogButton
          label={t.addFeedback}
          size="xs"
          variant="outline"
          title={t.addFeedback}
          description={t.description}
        >
          {(close) => (
            <FeedbackForm
              projectId={projectId}
              contentId={contentId}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
    </div>
  );
}

/** A feedback's status, changed in place. */
export function FeedbackStatusSelect({
  projectId,
  feedbackId,
  status,
}: {
  projectId: string;
  feedbackId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  const items = Object.fromEntries(
    FEEDBACK_STATUSES.map((s) => [s, t.feedbackStatuses[s]]),
  );
  return (
    <Select
      items={items}
      defaultValue={status}
      disabled={pending}
      onValueChange={(next) => {
        if (typeof next !== "string") return;
        startTransition(async () => {
          const r = await setFeedbackStatus({
            projectId,
            feedbackId,
            status: next as (typeof FEEDBACK_STATUSES)[number],
          });
          if (r.ok) toast.success(t.feedbackStatusSaved);
          else toast.error(r.error);
        });
      }}
    >
      <SelectTrigger size="sm" aria-label={t.feedback}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FEEDBACK_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {t.feedbackStatuses[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

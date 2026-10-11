"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useDialogSubmit } from "@/components/ui/use-dialog-submit";
import { fr } from "@/lib/i18n/fr";
import {
  decideClosure,
  reopenClosure,
  requestClosure,
} from "@/lib/marketing/closure/closure-actions";
import {
  CLOSURE_DECISIONS,
  type ClosureDecision,
} from "@/lib/marketing/closure/status";
import type { ActionOutcome } from "@/lib/utils/action-outcome";

const t = fr.marketingReview.decision;

/** « Demander la clôture du Marketing » (the owner), with a note. */
export function RequestClosureButton({
  projectId,
  reportId,
}: {
  projectId: string;
  reportId: string;
}) {
  return (
    <DialogButton
      label={t.request}
      variant="default"
      size="lg"
      title={t.requestTitle}
      description={t.requestBody}
    >
      {(close) => (
        <TextDialogForm
          id="closure-note"
          label={t.requestNote}
          submitLabel={t.request}
          done={t.requested}
          onDone={close}
          run={(note) => requestClosure({ projectId, reportId, note })}
        />
      )}
    </DialogButton>
  );
}

/** « Rouvrir le Marketing » (the direction), with a reason. */
export function ReopenClosureButton({
  projectId,
  closureId,
}: {
  projectId: string;
  closureId: string;
}) {
  return (
    <DialogButton
      label={t.reopen}
      title={t.reopenTitle}
      description={t.reopenBody}
    >
      {(close) => (
        <TextDialogForm
          id="closure-reopen"
          label={t.reopenReason}
          required
          submitLabel={t.reopen}
          done={t.reopened}
          onDone={close}
          run={(reason) => reopenClosure({ projectId, closureId, reason })}
        />
      )}
    </DialogButton>
  );
}

function TextDialogForm({
  id,
  label,
  required = false,
  submitLabel,
  done,
  onDone,
  run,
}: {
  id: string;
  label: string;
  required?: boolean;
  submitLabel: string;
  done: string;
  onDone: () => void;
  run: (text: string) => Promise<ActionOutcome>;
}) {
  const submit = useDialogSubmit(onDone, done);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const text = String(
          new FormData(event.currentTarget).get("text") ?? "",
        );
        submit.run(() => run(text));
      }}
    >
      <TextareaField
        id={id}
        name="text"
        label={label}
        required={required}
        rows={3}
        maxLength={2000}
      />
      <FormMessage kind="error">{submit.error}</FormMessage>
      <DialogFormActions
        pending={submit.pending}
        submitLabel={submitLabel}
        onCancel={onDone}
      />
    </form>
  );
}

/**
 * The validator's decision (écran 5): close without or with reserves, ask
 * for corrections, postpone. The database checks the reserves again.
 */
export function ClosureDecisionForm({
  projectId,
  closureId,
  suggested,
}: {
  projectId: string;
  closureId: string;
  // What the reserves allow: « sans réserve » when nothing is left.
  suggested: ClosureDecision;
}) {
  const [decision, setDecision] = useState<ClosureDecision>(suggested);
  const [comment, setComment] = useState("");
  const submit = useDialogSubmit(() => undefined, t.decided);
  const needsComment =
    decision === "changes_requested" || decision === "postponed";
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit.run(() =>
          decideClosure({ projectId, closureId, decision, comment }),
        );
      }}
    >
      <ChoiceCards
        name="closure-decision"
        legend={t.title}
        value={decision}
        onChange={setDecision}
        choices={CLOSURE_DECISIONS.map((d) => ({
          value: d,
          label: t.decisions[d],
          hint: t.hints[d],
        }))}
      />
      <TextareaField
        id={`closure-${closureId}-comment`}
        name="comment"
        label={t.comment}
        hint={needsComment ? t.commentRequired : undefined}
        aria-required={needsComment || undefined}
        rows={3}
        maxLength={2000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <FormMessage kind="error">{submit.error}</FormMessage>
      <Button
        type="submit"
        size="lg"
        className="w-fit"
        variant={needsComment ? "outline" : "default"}
        disabled={submit.pending || (needsComment && comment.trim() === "")}
        aria-busy={submit.pending || undefined}
      >
        {submit.pending ? t.deciding : t.decisions[decision]}
      </Button>
    </form>
  );
}

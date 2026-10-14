"use client";

import { useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { reviewLocation } from "@/lib/production/locations/actions";
import {
  VERDICTS,
  type LocationReview,
  type Verdict,
} from "@/lib/production/locations/types";

const t = fr.productionLocations.review;

/** « Donner mon avis » on a candidate (PROD-012), for a member consulted:
 * favorable, with reserves or unfavorable — why, when not favorable. */
export function LocationReviewButton({
  projectId,
  optionId,
  name,
  mine,
}: {
  projectId: string;
  optionId: string;
  name: string;
  mine: LocationReview | null;
}) {
  return (
    <DialogButton
      label={mine ? t.change : t.give}
      variant={mine ? "ghost" : "outline"}
      title={t.title(name)}
      description={t.description}
    >
      {(close) => (
        <ReviewForm
          projectId={projectId}
          optionId={optionId}
          mine={mine}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

export function ReviewFields({
  idPrefix,
  verdict,
  onVerdict,
  comment,
  missing,
}: {
  idPrefix: string;
  verdict: Verdict | null;
  onVerdict: (v: Verdict) => void;
  comment: string | null;
  missing: "verdict" | "comment" | null;
}) {
  const v = fr.productionLocations.verdicts;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <ChoiceCards
          name={`${idPrefix}-verdict`}
          legend={t.legend}
          required
          columns={3}
          value={verdict}
          onChange={onVerdict}
          choices={VERDICTS.map((x) => ({ value: x, label: v[x] }))}
        />
        {missing === "verdict" && (
          <FieldError id={`${idPrefix}-verdict-error`}>
            {t.missingVerdict}
          </FieldError>
        )}
      </div>
      <TextareaField
        id={`${idPrefix}-comment`}
        name="comment"
        label={t.comment}
        hint={t.commentHint}
        required={verdict !== null && verdict !== "favorable"}
        rows={3}
        maxLength={2000}
        defaultValue={comment ?? ""}
        error={missing === "comment" ? t.missingComment : undefined}
      />
    </>
  );
}

/** What a review form checks before it is sent. */
export function reviewMissing(verdict: Verdict | null, comment: string) {
  return !verdict
    ? ("verdict" as const)
    : verdict !== "favorable" && !comment.trim()
      ? ("comment" as const)
      : null;
}

function ReviewForm({
  projectId,
  optionId,
  mine,
  onDone,
}: {
  projectId: string;
  optionId: string;
  mine: LocationReview | null;
  onDone: () => void;
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(mine?.verdict ?? null);
  const [missing, setMissing] = useState<"verdict" | "comment" | null>(null);
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const comment = String(
          new FormData(event.currentTarget).get("comment") ?? "",
        );
        const lack = reviewMissing(verdict, comment);
        setMissing(lack);
        if (lack || !verdict) return;
        run(() => reviewLocation({ projectId, optionId, verdict, comment }));
      }}
    >
      <ReviewFields
        idPrefix={`review-${optionId}`}
        verdict={verdict}
        onVerdict={(next) => {
          setVerdict(next);
          setMissing(null);
        }}
        comment={mine?.comment ?? null}
        missing={missing}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={fr.productionPreprod.save}
        onCancel={onDone}
      />
    </form>
  );
}

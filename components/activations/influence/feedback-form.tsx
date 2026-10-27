"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { addFeedback } from "@/lib/activations/influence/content-actions";
import { activationInfluence } from "@/lib/i18n/fr/activation-influence";
import { activations } from "@/lib/i18n/fr/activations";

const fr = { activations, activationInfluence };

const t = fr.activationInfluence.contents;
const CATEGORIES = [
  "image",
  "sound",
  "text",
  "brand",
  "legal",
  "other",
] as const;
const TIMECODE = /^\d{1,2}(:\d{2}){1,2}$/;

/** A feedback on one version : optional timecode, category, comment. */
export function FeedbackForm({
  projectId,
  contentId,
  onDone,
}: {
  projectId: string;
  contentId: string;
  onDone: () => void;
}) {
  const [errors, setErrors] = useState<{ timecode?: string; comment?: string }>(
    {},
  );
  const { pending, error, run } = useWriteSubmit(onDone, t.feedbackAdded);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const timecode = String(data.get("timecode") ?? "").trim();
        const comment = String(data.get("comment") ?? "").trim();
        const next = {
          timecode:
            timecode && !TIMECODE.test(timecode) ? t.timecodeHint : undefined,
          comment: comment ? undefined : fr.activations.errors.reasonRequired,
        };
        setErrors(next);
        if (next.timecode || next.comment) return;
        run(() =>
          addFeedback({
            projectId,
            contentId,
            timecode,
            category: String(
              data.get("category"),
            ) as (typeof CATEGORIES)[number],
            comment,
          }),
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="timecode"
          label={t.timecode}
          hint={t.timecodeHint}
          placeholder="0:42"
          error={errors.timecode}
        />
        <OptionSelect
          name="category"
          label={t.category}
          required
          items={Object.fromEntries(
            CATEGORIES.map((c) => [c, t.categories[c]]),
          )}
          defaultValue="other"
        />
      </div>
      <TextareaField
        name="comment"
        label={t.feedbackComment}
        required
        rows={3}
        maxLength={2000}
        error={errors.comment}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.addFeedback}
        </Button>
      </div>
    </form>
  );
}

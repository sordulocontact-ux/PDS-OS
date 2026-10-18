"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.decisions.decision;

/**
 * What the decision panel becomes for the person asked to change
 * something (proto): under the `ReturnCallout`, « Votre réponse * » and
 * « Répondre et transmettre à nouveau ». The answer is required: red under
 * the field at the first try, never a disabled button.
 */
export function ResubmitForm({
  id = "resubmit",
  onResubmit,
  label = t.resubmit,
  done = t.resubmitted,
}: {
  id?: string;
  onResubmit: (answer: string) => Promise<WriteResult>;
  label?: string;
  done?: string;
}) {
  const [answer, setAnswer] = useState("");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => setAnswer(""), done);
  const fieldId = `${id}-answer`;
  return (
    <form
      noValidate
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const value = answer.trim();
        setMissing(!value);
        if (!value) {
          document.getElementById(fieldId)?.focus();
          return;
        }
        run(() => onResubmit(value));
      }}
    >
      <TextareaField
        id={fieldId}
        name="answer"
        label={t.answer}
        placeholder={t.answerHint}
        required
        rows={2}
        maxLength={2000}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        error={missing ? t.answerRequired : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {label}
        </Button>
      </div>
    </form>
  );
}

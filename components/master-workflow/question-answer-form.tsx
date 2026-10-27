"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChipMultiChoice } from "@/components/ui/chip-choice";
import { masterWorkflow } from "@/lib/i18n/fr/master-workflow";
import { answerBriefQuestion } from "@/lib/master-workflow/question-actions";
import {
  QUESTION_DELIVERABLES,
  questionDeliverablesOf,
  type QuestionDimension,
} from "@/lib/master-workflow/question-types";

const fr = { masterWorkflow };

/**
 * The answer of the person asked: a text for the direction, the deliverables
 * in pills (none ticked = « rien d'autre »). Sent once; their task is ticked.
 */
export function QuestionAnswerForm({
  projectId,
  questionId,
  dimension,
}: {
  projectId: string;
  questionId: string;
  dimension: QuestionDimension;
}) {
  const t = fr.masterWorkflow.questions;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = String(data.get("answer") ?? "");
        const choices =
          dimension === "deliverables"
            ? questionDeliverablesOf(
                JSON.parse(String(data.get("choices") ?? "[]")) as string[],
              )
            : null;
        startTransition(async () => {
          setError(null);
          const result = await answerBriefQuestion(
            projectId,
            questionId,
            text,
            choices,
          );
          if (!result.ok) {
            setError(result.error);
            return;
          }
          toast.success(t.answered);
        });
      }}
    >
      {dimension === "direction" ? (
        <TextareaField
          id={`answer-${questionId}`}
          name="answer"
          label={t.directionLabel}
          hint={t.directionHint}
          rows={4}
          maxLength={2000}
          required
        />
      ) : (
        <ChipMultiChoice
          name="choices"
          legend={t.deliverablesLabel}
          hint={t.deliverablesHint}
          options={QUESTION_DELIVERABLES.map((value) => ({
            value,
            label: fr.masterWorkflow.brief.deliverables[value],
          }))}
          defaultValue={[]}
        />
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t.answering : t.answer}
        </Button>
      </div>
    </form>
  );
}

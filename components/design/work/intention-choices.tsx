"use client";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { useCloseAccordion } from "@/components/shell/accordion-region";
import { Button } from "@/components/ui/button";
import { ChoiceGrid } from "@/components/ui/choice-grid";
import { ChoicesReadOnly } from "@/components/ui/choices-read-only";
import { ComposedAnswerField } from "@/components/ui/composed-answer-field";
import { sectionTitleClass } from "@/components/ui/option-class";
import { useComposedAnswer } from "@/components/ui/use-composed-answer";
import { VoiceFieldControl } from "@/components/voice/voice-field-control";
import { saveDesignIntention } from "@/lib/design/actions/intentions";
import {
  composeIntention,
  INTENTION_CHOICES,
  MAX_OTHER_CHARS,
} from "@/lib/design/intention-choices";
import type { DesignTopic } from "@/lib/design/intentions";
import { fr } from "@/lib/i18n/fr";
import type { ChoiceValue } from "@/lib/ui/choice-value";

/**
 * One intention question, answered like a question of the Stratégie
 * (StrategyChoices): the choices as cards, the answer written from them by
 * code, retouched by hand or by voice, then saved — which folds the row.
 */
export function IntentionChoices({
  projectId,
  deliverableId,
  topic,
  question,
  saved,
  savedText,
  canWrite,
}: {
  projectId: string;
  // Null: the overall direction.
  deliverableId: string | null;
  topic: DesignTopic;
  question: string;
  saved: ChoiceValue;
  savedText: string | null;
  canWrite: boolean;
}) {
  const t = fr.conceptionWork.choices;
  const labels: Record<string, string> = t.options[topic];
  const { pending, run } = useDesignAction();
  const close = useCloseAccordion() ?? undefined;
  const answer = useComposedAnswer({
    saved,
    savedText,
    compose: (v) => composeIntention(topic, v),
  });
  const titleId = `intention-question-${topic}`;
  const answerId = `intention-answer-${deliverableId ?? "direction"}-${topic}`;

  if (!canWrite)
    return (
      <ChoicesReadOnly
        question={question}
        chosen={[
          ...saved.choices.map((c) => labels[c]),
          ...(saved.other ? [saved.other] : []),
        ]}
        text={savedText}
        empty={t.none}
      />
    );

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h3 id={titleId} className={sectionTitleClass}>
        {question}
      </h3>

      <ChoiceGrid
        options={INTENTION_CHOICES[topic].map((c) => ({
          key: c,
          label: labels[c],
        }))}
        selected={answer.choices}
        onToggle={answer.toggle}
        other={{
          label: t.other,
          placeholder: t.otherPlaceholder,
          ariaLabel: `${question} — ${t.other}`,
          on: answer.otherOn,
          value: answer.other,
          maxLength: MAX_OTHER_CHARS,
          onToggle: answer.toggleOther,
          onChange: answer.changeOther,
        }}
      />

      {(answer.choices.length > 0 ||
        answer.otherOn ||
        answer.text.trim() !== "") && (
        <ComposedAnswerField
          id={answerId}
          label={t.answer}
          value={answer.text}
          onChange={answer.changeText}
          maxLength={2000}
          addon={<VoiceFieldControl fieldId={answerId} />}
        />
      )}

      {(answer.manual || answer.dirty || close) && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {answer.manual && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={answer.recompose}
            >
              {t.recompose}
            </Button>
          )}
          {answer.dirty ? (
            <Button
              disabled={pending || !answer.text.trim()}
              onClick={() =>
                run(
                  () =>
                    saveDesignIntention(
                      projectId,
                      deliverableId,
                      topic,
                      answer.text,
                      answer.value,
                    ),
                  { success: t.saved, onSuccess: close },
                )
              }
            >
              {pending ? t.saving : t.save}
            </Button>
          ) : (
            close && <Button onClick={close}>{t.done}</Button>
          )}
        </div>
      )}
    </section>
  );
}

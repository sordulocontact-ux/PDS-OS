"use client";

import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { useCloseAccordion } from "@/components/shell/accordion-region";
import { SuggestionList } from "@/components/strategy/suggestion-list";
import { Button } from "@/components/ui/button";
import { ChoiceGrid } from "@/components/ui/choice-grid";
import { ChoicesReadOnly } from "@/components/ui/choices-read-only";
import { ComposedAnswerField } from "@/components/ui/composed-answer-field";
import { sectionTitleClass } from "@/components/ui/option-class";
import { useComposedAnswer } from "@/components/ui/use-composed-answer";
import { confirmField, rejectField } from "@/lib/framing/actions/brief";
import type { StrategyFieldState } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import { saveStrategyAnswer } from "@/lib/strategy/actions/choices";
import {
  STRATEGY_CHOICES,
  type ChoiceSuggestion,
  type ChoiceValue,
} from "@/lib/strategy/choices";
import { composeAnswer } from "@/lib/strategy/compose";

// One question of the Strategy: the choices as cards (blue once checked), the
// answer written from them, then PO's pre-checks. Checking answers writes the
// answer text right away (composed by code, several choices blend into one
// sentence); the owner edits or completes it, then saves both together. A
// text proposed by a call or a dictation is confirmed or rejected here.
export function StrategyChoices({
  field,
  value,
  suggestions,
  projectId,
}: {
  field: StrategyFieldState;
  value: ChoiceValue;
  suggestions: ChoiceSuggestion[];
  projectId: string;
}) {
  const key = field.key;
  const t = fr.strategy.choices;
  const a = fr.framing.actions;
  const labels: Record<string, string> = t.options[key];
  const canEdit = useCanEditProject();
  const { pending, run } = useFramingAction();
  // On the pilotage, a saved or confirmed answer folds its dimension back.
  const closeDimension = useCloseAccordion() ?? undefined;
  const answer = useComposedAnswer({
    saved: value,
    savedText: field.value,
    compose: (v) => composeAnswer(key, v),
  });
  const titleId = `choices-${key}`;
  const saved = !answer.dirty;

  if (!canEdit)
    return (
      <ChoicesReadOnly
        question={t.questions[key]}
        chosen={[
          ...value.choices.map((c) => labels[c]),
          ...(value.other ? [value.other] : []),
        ]}
        text={field.value}
        empty={t.none}
      />
    );

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h3 id={titleId} className={sectionTitleClass}>
        {t.questions[key]}
      </h3>

      <ChoiceGrid
        options={STRATEGY_CHOICES[key].map((c) => ({
          key: c,
          label: labels[c],
        }))}
        selected={answer.choices}
        onToggle={answer.toggle}
        other={{
          label: t.other,
          placeholder: t.otherPlaceholder,
          ariaLabel: `${t.questions[key]} — ${t.other}`,
          on: answer.otherOn,
          value: answer.other,
          maxLength: 300,
          onToggle: answer.toggleOther,
          onChange: answer.changeOther,
        }}
      />

      {suggestions.length > 0 && (
        <SuggestionList
          field={key}
          suggestions={suggestions}
          projectId={projectId}
          onAccepted={answer.add}
        />
      )}

      {(answer.choices.length > 0 ||
        answer.otherOn ||
        answer.text.trim() !== "") && (
        <ComposedAnswerField
          id={`answer-${key}`}
          label={t.answer}
          badges={
            <>
              {field.status === "proposed" && <ProposedBadge />}
              <ProvenanceNote provenance={field.provenance} />
            </>
          }
          value={answer.text}
          onChange={answer.changeText}
        />
      )}

      {(answer.manual ||
        !saved ||
        field.status === "proposed" ||
        closeDimension) && (
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
          {saved && field.status === "proposed" && (
            <>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  run(() => rejectField(projectId, "strategy", key))
                }
              >
                {a.reject}
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  run(
                    () => confirmField(projectId, "strategy", key),
                    closeDimension,
                  )
                }
              >
                {a.confirm}
              </Button>
            </>
          )}
          {!saved && (
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    saveStrategyAnswer(
                      projectId,
                      key,
                      answer.value,
                      answer.text,
                    ),
                  closeDimension,
                )
              }
            >
              {pending ? t.saving : t.save}
            </Button>
          )}
          {saved && field.status !== "proposed" && closeDimension && (
            <Button onClick={closeDimension}>{fr.strategyPilot.done}</Button>
          )}
        </div>
      )}
    </section>
  );
}

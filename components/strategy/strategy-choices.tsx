"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { ChoicesReadOnly } from "@/components/strategy/choices-read-only";
import { SuggestionList } from "@/components/strategy/suggestion-list";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import type { StrategyTextField } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveStrategyAnswer } from "@/lib/strategy/actions/choices";
import {
  STRATEGY_CHOICES,
  type ChoiceSuggestion,
  type ChoiceValue,
} from "@/lib/strategy/choices";
import { composeAnswer } from "@/lib/strategy/compose";

// Closed-choice question of a Strategy field. Checking answers writes the
// answer text right away (composed by code, several choices blend into one
// sentence); the owner edits or completes it, then saves both together.
// PO's pre-checks can be accepted or dismissed.
export function StrategyChoices({
  field,
  value,
  suggestions,
  projectId,
  currentText,
}: {
  field: StrategyTextField;
  value: ChoiceValue;
  // The saved answer text of the field, if any.
  currentText: string | null;
  suggestions: ChoiceSuggestion[];
  projectId: string;
}) {
  const t = fr.strategy.choices;
  const labels: Record<string, string> = t.options[field];
  const canEdit = useCanEditProject();
  const { pending, run } = useFramingAction();
  const [choices, setChoices] = useState<string[]>(value.choices);
  const [otherOn, setOtherOn] = useState(value.other !== null);
  const [other, setOther] = useState(value.other ?? "");
  const questionId = `choices-${field}`;
  const answerId = `answer-${field}`;

  // The text follows the choices until the owner types in it themselves.
  const composedFromSaved = composeAnswer(field, value);
  const [text, setText] = useState(currentText ?? composedFromSaved);
  const [manual, setManual] = useState(
    currentText !== null && currentText !== composedFromSaved,
  );
  const compose = (
    nextChoices: string[],
    nextOther: string,
    otherShown: boolean,
  ) =>
    composeAnswer(field, {
      choices: nextChoices,
      other: otherShown && nextOther.trim() ? nextOther : null,
    });
  const follow = (
    nextChoices: string[],
    nextOther: string,
    otherShown: boolean,
  ) => {
    if (!manual) setText(compose(nextChoices, nextOther, otherShown));
  };

  const saved =
    JSON.stringify([...choices].sort()) ===
      JSON.stringify([...value.choices].sort()) &&
    (otherOn ? other.trim() : "") === (value.other ?? "") &&
    text.trim() === (currentText ?? composedFromSaved).trim();

  if (!canEdit) return <ChoicesReadOnly field={field} value={value} />;

  const toggle = (choice: string) => {
    const next = choices.includes(choice)
      ? choices.filter((c) => c !== choice)
      : [...choices, choice];
    setChoices(next);
    follow(next, other, otherOn);
  };

  return (
    <fieldset className="grid gap-3 pt-4" aria-describedby={questionId}>
      <legend id={questionId} className="text-sm font-medium">
        {t.questions[field]}
      </legend>
      <div className="flex flex-wrap gap-2">
        {STRATEGY_CHOICES[field].map((choice) => (
          <FilterChip
            key={choice}
            pressed={choices.includes(choice)}
            onClick={() => toggle(choice)}
          >
            {labels[choice]}
          </FilterChip>
        ))}
        <FilterChip
          pressed={otherOn}
          onClick={() => {
            setOtherOn(!otherOn);
            follow(choices, other, !otherOn);
          }}
        >
          {t.other}
        </FilterChip>
      </div>
      {otherOn && (
        <Input
          aria-label={`${t.questions[field]} — ${t.other}`}
          value={other}
          onChange={(e) => {
            setOther(e.target.value);
            follow(choices, e.target.value, otherOn);
          }}
          placeholder={t.otherPlaceholder}
          maxLength={300}
          className="h-10 text-base md:text-sm"
        />
      )}
      {(choices.length > 0 || otherOn || text.trim() !== "") && (
        <div className="grid gap-1.5">
          <Label htmlFor={answerId}>{t.answer}</Label>
          <Textarea
            id={answerId}
            value={text}
            rows={3}
            onChange={(e) => {
              setText(e.target.value);
              setManual(true);
            }}
            className="text-base md:text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{t.answerHint}</p>
            {manual && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setText(compose(choices, other, otherOn));
                  setManual(false);
                }}
              >
                {t.recompose}
              </Button>
            )}
          </div>
        </div>
      )}
      {!saved && (
        <Button
          size="sm"
          className="justify-self-start"
          disabled={pending}
          onClick={() =>
            run(() =>
              saveStrategyAnswer(
                projectId,
                field,
                { choices, other: otherOn ? other : null },
                text,
              ),
            )
          }
        >
          {pending ? t.saving : t.save}
        </Button>
      )}
      {suggestions.length > 0 && (
        <SuggestionList
          field={field}
          suggestions={suggestions}
          projectId={projectId}
          onAccepted={(accepted) => {
            const next = [...new Set([...choices, ...accepted])];
            setChoices(next);
            follow(next, other, otherOn);
          }}
        />
      )}
    </fieldset>
  );
}

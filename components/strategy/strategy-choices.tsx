"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useState } from "react";

import { ProposedBadge } from "@/components/framing/proposed-badge";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { ChoicesReadOnly } from "@/components/strategy/choices-read-only";
import { useCloseDimension } from "@/components/strategy/dimension-region";
import {
  labelClass,
  optionClass,
  sectionTitleClass,
} from "@/components/strategy/option-class";
import { SuggestionList } from "@/components/strategy/suggestion-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const closeDimension = useCloseDimension() ?? undefined;
  const [choices, setChoices] = useState<string[]>(value.choices);
  const [otherOn, setOtherOn] = useState(value.other !== null);
  const [other, setOther] = useState(value.other ?? "");
  const titleId = `choices-${key}`;
  const answerId = `answer-${key}`;
  const currentText = field.value;

  // The text follows the choices until the owner types in it themselves.
  const composedFromSaved = composeAnswer(key, value);
  const [text, setText] = useState(currentText ?? composedFromSaved);
  const [manual, setManual] = useState(
    currentText !== null && currentText !== composedFromSaved,
  );
  const compose = (
    nextChoices: string[],
    nextOther: string,
    otherShown: boolean,
  ) =>
    composeAnswer(key, {
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

  if (!canEdit)
    return <ChoicesReadOnly field={key} value={value} text={currentText} />;

  const toggle = (choice: string) => {
    const next = choices.includes(choice)
      ? choices.filter((c) => c !== choice)
      : [...choices, choice];
    setChoices(next);
    follow(next, other, otherOn);
  };

  const card = (
    id: string,
    selected: boolean,
    label: string,
    onClick: () => void,
  ) => (
    <button
      key={id}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={optionClass(selected)}
    >
      <span className="min-w-0 flex-1 font-medium break-words text-foreground">
        {label}
      </span>
      {selected && <IconCheck aria-hidden className="mt-1 size-4 shrink-0" />}
    </button>
  );

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h3 id={titleId} className={sectionTitleClass}>
        {t.questions[key]}
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        {STRATEGY_CHOICES[key].map((choice) =>
          card(choice, choices.includes(choice), labels[choice], () =>
            toggle(choice),
          ),
        )}
        {card("other", otherOn, t.other, () => {
          setOtherOn(!otherOn);
          follow(choices, other, !otherOn);
        })}
      </div>

      {otherOn && (
        <Input
          aria-label={`${t.questions[key]} — ${t.other}`}
          value={other}
          onChange={(e) => {
            setOther(e.target.value);
            follow(choices, e.target.value, otherOn);
          }}
          placeholder={t.otherPlaceholder}
          maxLength={300}
          className="h-10 text-base md:text-sm"
          autoFocus
        />
      )}

      {suggestions.length > 0 && (
        <SuggestionList
          field={key}
          suggestions={suggestions}
          projectId={projectId}
          onAccepted={(accepted) => {
            const next = [...new Set([...choices, ...accepted])];
            setChoices(next);
            follow(next, other, otherOn);
          }}
        />
      )}

      {(choices.length > 0 || otherOn || text.trim() !== "") && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={answerId} className={labelClass}>
              {t.answer}
            </label>
            {field.status === "proposed" && <ProposedBadge />}
            <ProvenanceNote provenance={field.provenance} />
          </div>
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
        </div>
      )}

      {(manual || !saved || field.status === "proposed" || closeDimension) && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {manual && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setText(compose(choices, other, otherOn));
                setManual(false);
              }}
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
                      { choices, other: otherOn ? other : null },
                      text,
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

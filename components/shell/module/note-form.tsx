"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { stepTools } from "@/lib/i18n/fr/step-tools";
import { noteStepInformation } from "@/lib/step-tools/actions";
import {
  NOTE_SOURCES,
  NOTE_STATUSES,
  stepChoiceKey,
  stepOfChoice,
  type NoteSource,
  type NoteStatus,
  type StepChoice,
  type StepNote,
  type StepRef,
} from "@/lib/step-tools/model";

import { ToolCard } from "./tool-card";

const fr = { stepTools };

const t = fr.stepTools;
// The « Rien » of « Contredit » (a select has no empty value).
const NOTHING = "none";

/** What PO or a draft already knows, to correct rather than retype. */
export type NoteDefaults = {
  body?: string;
  source?: NoteSource;
  status?: NoteStatus;
};

/**
 * « Noter une information » (proto decisionForm): what was said, its source,
 * its status (« À confirmer » by default), the step it concerns, the note it
 * contradicts. A note never moves a step forward.
 */
export function NoteForm({
  stepRef,
  steps,
  notes,
  defaults,
  onDone,
}: {
  stepRef: StepRef;
  // The « Étape concernée » choices; without them, the note is the step's.
  steps?: StepChoice[];
  // The notes it may contradict (the project's, not discarded).
  notes: StepNote[];
  defaults?: NoteDefaults;
  onDone: () => void;
}) {
  const [missing, setMissing] = useState(false);
  const [contradicts, setContradicts] = useState(NOTHING);
  const { pending, error, run } = useWriteSubmit(
    onDone,
    contradicts === NOTHING ? t.noteForm.done : t.noteForm.doneContradiction,
  );
  const live = notes.filter((n) => !n.discarded);

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const body = String(data.get("body") ?? "").trim();
    setMissing(!body);
    if (!body) {
      form.querySelector<HTMLElement>('[name="body"]')?.focus();
      return;
    }
    const where =
      stepOfChoice(stepRef.projectId, String(data.get("step") ?? "")) ??
      stepRef;
    const target = String(data.get("contradicts") ?? NOTHING);
    run(() =>
      noteStepInformation({
        ...where,
        body,
        source: String(data.get("source")) as NoteSource,
        status: String(data.get("status")) as NoteStatus,
        contradictsId: target === NOTHING ? "" : target,
      }),
    );
  }

  return (
    <ToolCard title={t.noteForm.title}>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit(event.currentTarget);
        }}
      >
        <Field
          name="body"
          label={t.noteForm.what}
          required
          maxLength={1000}
          autoComplete="off"
          placeholder={t.noteForm.whatPlaceholder}
          defaultValue={defaults?.body}
          error={missing ? t.noteForm.missingWhat : undefined}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <OptionSelect
            name="source"
            label={t.noteForm.source}
            items={Object.fromEntries(
              NOTE_SOURCES.map((s) => [s, t.sources[s]]),
            )}
            defaultValue={defaults?.source ?? "call"}
          />
          <OptionSelect
            name="status"
            label={t.noteForm.status}
            items={Object.fromEntries(
              NOTE_STATUSES.map((s) => [s, t.statuses[s]]),
            )}
            defaultValue={defaults?.status ?? "to_confirm"}
          />
          {steps && steps.length > 0 && (
            <OptionSelect
              name="step"
              label={t.noteForm.step}
              items={Object.fromEntries(steps.map((s) => [s.key, s.label]))}
              defaultValue={stepChoiceKey(stepRef)}
            />
          )}
          <OptionSelect
            name="contradicts"
            label={t.noteForm.contradicts}
            items={{
              [NOTHING]: t.noteForm.nothing,
              ...Object.fromEntries(live.map((n) => [n.id, n.body])),
            }}
            defaultValue={NOTHING}
            onValueChange={setContradicts}
          />
        </div>
        {missing && <FormMessage kind="error">{t.missingCount(1)}</FormMessage>}
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {t.noteForm.submit}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {t.cancel}
          </Button>
        </div>
      </form>
    </ToolCard>
  );
}

"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useDialogSubmit } from "@/components/ui/use-dialog-submit";
import {
  CHECK_RESULTS,
  type CheckKey,
  type CheckResult,
} from "@/lib/distribution/checks";
import { recordDistributionCheck } from "@/lib/distribution/validation-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.distribution.checks;

/** « Enregistrer » one check: what the person verified, never the code. */
export function CheckButton({
  projectId,
  checkKey,
  result,
  note,
}: {
  projectId: string;
  checkKey: CheckKey;
  result: CheckResult;
  note: string | null;
}) {
  const label = t.items[checkKey].label;
  return (
    <DialogButton
      label={t.record}
      title={t.form.title(label)}
      description={t.form.description}
    >
      {(close) => (
        <CheckForm
          projectId={projectId}
          checkKey={checkKey}
          result={result}
          note={note}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function CheckForm({
  projectId,
  checkKey,
  result,
  note,
  onDone,
}: {
  projectId: string;
  checkKey: CheckKey;
  result: CheckResult;
  note: string | null;
  onDone: () => void;
}) {
  const [choice, setChoice] = useState<CheckResult>(
    result === "unchecked" ? "compliant" : result,
  );
  const [noteError, setNoteError] = useState<string>();
  const { pending, error, run } = useDialogSubmit(onDone, t.form.saved);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get("note") ?? "");
    if (choice === "non_compliant" && !text.trim()) {
      setNoteError(t.form.noteRequired);
      return;
    }
    setNoteError(undefined);
    run(() =>
      recordDistributionCheck({
        projectId,
        key: checkKey,
        result: choice,
        note: text,
      }),
    );
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <ChoiceCards
        name="result"
        legend={t.form.result}
        value={choice}
        onChange={setChoice}
        choices={CHECK_RESULTS.map((value) => ({
          value,
          label: t.results[value],
          hint: t.resultHints[value],
        }))}
      />
      <TextareaField
        name="note"
        label={t.form.note}
        rows={2}
        maxLength={1000}
        defaultValue={note ?? ""}
        required={choice === "non_compliant"}
        error={noteError}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.form.submit}
        onCancel={onDone}
      />
    </form>
  );
}

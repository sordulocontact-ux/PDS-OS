"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { NoteForm } from "@/components/distribution/note-form";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useDialogSubmit } from "@/components/ui/use-dialog-submit";
import {
  decideDistributionVersion,
  setDistributionValidator,
} from "@/lib/distribution/validation-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.distribution.validation;

/** « Désigner » / « Changer » the validator: a holder of `validate`. */
export function ValidatorButton({
  projectId,
  current,
  options,
}: {
  projectId: string;
  current: string | null;
  options: Array<{ personId: string; name: string }>;
}) {
  return (
    <DialogButton
      label={current ? t.change : t.designate}
      title={t.validator}
      description={t.description}
    >
      {(close) => (
        <ValidatorForm
          projectId={projectId}
          current={current}
          options={options}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function ValidatorForm({
  projectId,
  current,
  options,
  onDone,
}: {
  projectId: string;
  current: string | null;
  options: Array<{ personId: string; name: string }>;
  onDone: () => void;
}) {
  const [personId, setPersonId] = useState<string | null>(
    current ?? options[0]?.personId ?? null,
  );
  const { pending, error, run } = useDialogSubmit(onDone, t.validator);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    if (!personId) return;
    run(() => setDistributionValidator({ projectId, personId }));
  }

  if (options.length === 0)
    return (
      <p className="text-sm text-muted-foreground">{t.noValidatorOption}</p>
    );
  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <ChoiceCards
        name="validator"
        legend={t.validator}
        value={personId}
        onChange={setPersonId}
        choices={options.map((option) => ({
          value: option.personId,
          label: option.name,
        }))}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.designate}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Refuser » a version: the reason is required. */
export function RejectButton({
  projectId,
  versionId,
  number,
}: {
  projectId: string;
  versionId: string;
  number: number;
}) {
  return (
    <DialogButton
      label={t.reject}
      title={t.rejectTitle(number)}
      description={t.rejectBody}
    >
      {(close) => (
        <NoteForm
          label={t.rejectNote}
          submitLabel={t.reject}
          done={t.decided}
          onDone={close}
          send={(note) =>
            decideDistributionVersion({
              projectId,
              versionId,
              approve: false,
              note,
            })
          }
        />
      )}
    </DialogButton>
  );
}

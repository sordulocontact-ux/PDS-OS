"use client";

import { IconFile } from "nucleo-sharp-essential";
import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { NoteForm } from "@/components/distribution/note-form";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FileDropZone } from "@/components/ui/file-drop-zone";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { DeclarationKind } from "@/lib/distribution/tracking";
import { withdrawDistributionDeclaration } from "@/lib/distribution/tracking-actions";
import { declareWithProof } from "@/lib/distribution/upload-proof";
import { distribution } from "@/lib/i18n/fr/distribution";
import { useDistributionRelease } from "@/components/distribution/frame/release-scope";

const fr = { distribution };

const t = fr.distribution.tracking;

// Today in the browser's time zone, as the date field expects it.
const today = () => new Date().toLocaleDateString("sv-SE");

/** One declaration of the owner: the deposit or an answer of the
 * distributor, with its optional date, identifier and proof. */
export function DeclarationButton({
  projectId,
  organizationId,
  kind,
  primary = false,
}: {
  projectId: string;
  organizationId: string;
  kind: DeclarationKind;
  primary?: boolean;
}) {
  return (
    <DialogButton
      label={t.kinds[kind]}
      variant={primary ? "default" : "outline"}
      title={t.kindTitles[kind]}
      description={t.kindBodies[kind]}
    >
      {(close) => (
        <DeclarationForm
          projectId={projectId}
          organizationId={organizationId}
          kind={kind}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function DeclarationForm({
  projectId,
  organizationId,
  kind,
  onDone,
}: {
  projectId: string;
  organizationId: string;
  kind: DeclarationKind;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [noteError, setNoteError] = useState<string>();
  const { pending, error, run } = useWriteSubmit(onDone, t.form.saved);
  const corrections = kind === "corrections_requested";

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const note = String(data.get("note") ?? "");
    if (corrections && !note.trim()) {
      setNoteError(t.form.noteRequired);
      return;
    }
    setNoteError(undefined);
    run(() =>
      declareWithProof({
        organizationId,
        projectId,
        kind,
        declaredOn: String(data.get("declaredOn") ?? ""),
        orchardId: String(data.get("orchardId") ?? ""),
        note,
        proofUrl: String(data.get("proofUrl") ?? ""),
        file,
      }),
    );
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <Field
        name="declaredOn"
        label={t.form.declaredOn}
        type="date"
        max={today()}
      />
      {kind === "deposit" && (
        <Field
          name="orchardId"
          label={t.form.orchardId}
          maxLength={100}
          autoComplete="off"
        />
      )}
      <TextareaField
        name="note"
        label={corrections ? t.form.noteCorrections : t.form.note}
        rows={corrections ? 3 : 2}
        maxLength={1000}
        required={corrections}
        error={noteError}
      />
      <div className="flex flex-col gap-1.5">
        <FileDropZone
          label={t.form.proofFile}
          hint={t.form.proofHint}
          icon={IconFile}
          onFiles={(files) => files[0] && setFile(files[0])}
        />
        {file && (
          <p className="text-sm break-all text-muted-foreground">
            {t.form.proofChosen(file.name)}
          </p>
        )}
      </div>
      <Field
        name="proofUrl"
        label={t.form.proofUrl}
        hint={t.form.proofUrlHint}
        type="url"
        maxLength={2048}
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

/** « Retirer » a declaration made by mistake: kept, with the reason. */
export function WithdrawButton({
  projectId,
  declarationId,
}: {
  projectId: string;
  declarationId: string;
}) {
  const releaseId = useDistributionRelease();
  return (
    <DialogButton
      label={t.withdraw}
      variant="ghost"
      size="xs"
      title={t.withdrawTitle}
      description={t.withdrawBody}
    >
      {(close) => (
        <NoteForm
          label={t.withdrawNote}
          submitLabel={t.withdraw}
          done={t.withdrawn}
          onDone={close}
          send={(note) =>
            withdrawDistributionDeclaration({
              projectId,
              releaseId,
              declarationId,
              note,
            })
          }
        />
      )}
    </DialogButton>
  );
}

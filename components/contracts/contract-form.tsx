"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ContractDateFields } from "@/components/contracts/contract-date-fields";
import {
  AlreadySignedField,
  SIGNED_ON_FIELD,
} from "@/components/contracts/already-signed-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { FilePickField } from "@/components/ui/file-pick-field";
import { saveContract } from "@/lib/contracts/actions";
import {
  CONTRACT_TYPES,
  type ContractFormOptions,
  type ContractValues,
} from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { todayInParis } from "@/lib/insights/dates";
import { cn } from "@/lib/utils";

const fr = { contracts };

/**
 * A contract, created or edited in the modal: what it is, who follows it,
 * what it is about (project, artist), its dates. Parties and files are added
 * on its page. Each field takes its column's width (docs/DESIGN.md « Largeur
 * d'un champ »); two side by side only when the form has room (a container
 * query: beside a document, one column).
 */
export function ContractForm({
  contract,
  initial,
  stay = false,
  options,
  onSaved,
  onCancel,
  document,
  existing = false,
  signedOn: readSignedOn = null,
}: {
  // Absent: a new contract.
  contract?: ContractValues;
  // A new contract already filled: attached to a project (Juridique), or a
  // draft of PO.
  initial?: Partial<Omit<ContractValues, "id">>;
  // Created from another page (PO's panel): stay there instead of opening it.
  stay?: boolean;
  options: ContractFormOptions;
  // The file chosen goes with it (« Importer un contrat » of a deal);
  // `signedOn`: « Déjà signé » ticked, its day.
  onSaved: (id: string, file: File | null, signedOn: string | null) => void;
  onCancel: () => void;
  // A document to import with the new contract, required (Sacha
  // 23/11/2026: « importer des docs », the form kept): kept in the browser,
  // uploaded by the caller once the contract exists (`onSaved`).
  // `file`: already dropped (« Nouveau contrat » reads it first);
  // `onFile`: another file chosen in its place.
  document?: {
    label: string;
    hint: string;
    accept: string;
    file?: File;
    onFile?: (file: File) => void;
  };
  // A contract that already exists, its file beside the form (« Déposer un
  // contrat existant »): no due day nor notes, those are for one to write;
  // « Déjà signé » with its day instead.
  existing?: boolean;
  // The signature day the document states (« Fait à …, le … »).
  signedOn?: string | null;
}) {
  const t = fr.contracts.form;
  const [state, formAction, pending] = useActionState(saveContract, null);
  const [file, setFile] = useState<File | null>(document?.file ?? null);
  const [fileMissing, setFileMissing] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signedError, setSignedError] = useState<string | null>(null);
  // The day ticked, read at submit: given back with the new contract.
  const signedDay = useRef<string | null>(null);

  useEffect(() => {
    if (state?.ok) onSaved(state.id, file, signedDay.current);
    // onSaved changes with each render of the parent; the result is what counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const error = state && !state.ok ? state : null;

  return (
    <form
      action={formAction}
      className="@container flex flex-col gap-5"
      onSubmit={(event) => {
        const day = signed
          ? String(new FormData(event.currentTarget).get(SIGNED_ON_FIELD) ?? "")
          : "";
        signedDay.current = signed ? day : null;
        const signedWrong = !signed
          ? null
          : !day
            ? fr.contracts.creation.signedOnMissing
            : day > todayInParis()
              ? fr.contracts.errors.signedOn
              : null;
        setSignedError(signedWrong);
        if ((document && !file) || signedWrong) {
          event.preventDefault();
          setFileMissing(Boolean(document && !file));
        }
      }}
    >
      {document && (
        <FilePickField
          id="contract-document"
          label={document.label}
          hint={document.hint}
          accept={document.accept}
          file={file}
          chosenLabel={t.documentChosen}
          error={fileMissing && !file ? t.documentMissing : null}
          onFile={(chosen) => {
            setFile(chosen);
            setFileMissing(false);
            document.onFile?.(chosen);
          }}
        />
      )}
      {contract && <input type="hidden" name="id" value={contract.id} />}
      {stay && <input type="hidden" name="stay" value="1" />}
      <Field
        name="title"
        label={t.title}
        required
        maxLength={200}
        autoComplete="off"
        placeholder={t.titlePlaceholder}
        defaultValue={contract?.title ?? initial?.title}
        error={error?.field === "title" ? error.error : undefined}
      />
      <OptionSelect
        name="type"
        label={t.type}
        required
        items={Object.fromEntries(
          CONTRACT_TYPES.map((type) => [type, fr.contracts.types[type]]),
        )}
        defaultValue={contract?.type ?? initial?.type ?? "artist"}
      />
      {options.owners.length > 0 && (
        <OptionSelect
          name="ownerPersonId"
          label={t.owner}
          // « Jusqu'à sa signature »: not for one already signed.
          hint={existing ? undefined : t.ownerHint}
          items={Object.fromEntries(
            options.owners.map((owner) => [owner.personId, owner.name]),
          )}
          defaultValue={
            contract?.ownerPersonId ??
            initial?.ownerPersonId ??
            options.owners[0]?.personId
          }
        />
      )}
      <div className="grid gap-5 @md:grid-cols-2">
        <OptionSelect
          name="projectId"
          label={t.project}
          items={{
            none: t.projectNone,
            ...Object.fromEntries(options.projects.map((p) => [p.id, p.title])),
          }}
          defaultValue={contract?.projectId ?? initial?.projectId ?? "none"}
        />
        <OptionSelect
          name="artistId"
          label={t.artist}
          items={{
            none: t.artistNone,
            ...Object.fromEntries(options.artists.map((a) => [a.id, a.name])),
          }}
          defaultValue={contract?.artistId ?? initial?.artistId ?? "none"}
        />
      </div>
      <ContractDateFields
        existing={existing}
        dueOn={contract?.dueOn ?? initial?.dueOn ?? ""}
        startsOn={contract?.startsOn ?? initial?.startsOn ?? ""}
        endsOn={contract?.endsOn ?? initial?.endsOn ?? ""}
        endsOnError={error?.field === "endsOn" ? error.error : undefined}
      />
      {existing && (
        <AlreadySignedField
          checked={signed}
          onChecked={(next) => {
            setSigned(next);
            setSignedError(null);
          }}
          signedOn={readSignedOn}
          error={signedError}
        />
      )}
      {!existing && (
        <TextareaField
          name="notes"
          label={t.notes}
          maxLength={4000}
          rows={3}
          placeholder={t.notesPlaceholder}
          defaultValue={contract?.notes ?? initial?.notes ?? ""}
        />
      )}
      {error && !error.field && (
        <FormMessage kind="error">{error.error}</FormMessage>
      )}
      {/* Beside a document, the column scrolls: its actions stay in view. */}
      <div
        className={cn(
          "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
          existing &&
            "sticky bottom-0 bg-[var(--surface-raised)] py-3 lg:-mb-px",
        )}
      >
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t.pending : contract ? t.submitEdit : t.submitCreate}
        </Button>
      </div>
    </form>
  );
}

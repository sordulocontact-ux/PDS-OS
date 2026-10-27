"use client";

import { useActionState, useEffect } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { saveContract } from "@/lib/contracts/actions";
import {
  CONTRACT_TYPES,
  type ContractFormOptions,
  type ContractValues,
} from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

/**
 * A contract, created or edited in the modal: what it is, who follows it,
 * what it is about (project, artist), its dates. Parties and files are added
 * on its page.
 */
export function ContractForm({
  contract,
  initial,
  stay = false,
  options,
  onSaved,
  onCancel,
}: {
  // Absent: a new contract.
  contract?: ContractValues;
  // A new contract already filled: attached to a project (Juridique), or a
  // draft of PO.
  initial?: Partial<Omit<ContractValues, "id">>;
  // Created from another page (PO's panel): stay there instead of opening it.
  stay?: boolean;
  options: ContractFormOptions;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const t = fr.contracts.form;
  const [state, formAction, pending] = useActionState(saveContract, null);

  useEffect(() => {
    if (state?.ok) onSaved(state.id);
    // onSaved changes with each render of the parent; the result is what counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const error = state && !state.ok ? state : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
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
          hint={t.ownerHint}
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
      <div className="grid gap-5 sm:grid-cols-2">
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
      <Field
        name="dueOn"
        type="date"
        label={t.dueOn}
        hint={t.dueOnHint}
        defaultValue={contract?.dueOn ?? initial?.dueOn ?? ""}
        className="h-10 w-fit text-base md:text-sm"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="startsOn"
          type="date"
          label={t.startsOn}
          defaultValue={contract?.startsOn ?? initial?.startsOn ?? ""}
          className="h-10 w-fit text-base md:text-sm"
        />
        <Field
          name="endsOn"
          type="date"
          label={t.endsOn}
          defaultValue={contract?.endsOn ?? initial?.endsOn ?? ""}
          error={error?.field === "endsOn" ? error.error : undefined}
          className="h-10 w-fit text-base md:text-sm"
        />
      </div>
      <TextareaField
        name="notes"
        label={t.notes}
        maxLength={4000}
        rows={3}
        placeholder={t.notesPlaceholder}
        defaultValue={contract?.notes ?? initial?.notes ?? ""}
      />
      {error && !error.field && (
        <FormMessage kind="error">{error.error}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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

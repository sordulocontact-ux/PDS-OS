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
import { fr } from "@/lib/i18n/fr";

/**
 * A contract, created or edited in the modal: what it is, who follows it,
 * what it is about (project, artist), its dates. Parties and files are added
 * on its page.
 */
export function ContractForm({
  contract,
  options,
  onSaved,
  onCancel,
}: {
  // Absent: a new contract.
  contract?: ContractValues;
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
  const optional = (label: string) => `${label} · ${t.optional}`;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {contract && <input type="hidden" name="id" value={contract.id} />}
      <Field
        name="title"
        label={t.title}
        required
        maxLength={200}
        autoComplete="off"
        placeholder={t.titlePlaceholder}
        defaultValue={contract?.title}
        error={error?.field === "title" ? error.error : undefined}
      />
      <OptionSelect
        name="type"
        label={t.type}
        items={Object.fromEntries(
          CONTRACT_TYPES.map((type) => [type, fr.contracts.types[type]]),
        )}
        defaultValue={contract?.type ?? "artist"}
      />
      {options.owners.length > 0 && (
        <OptionSelect
          name="ownerPersonId"
          label={t.owner}
          hint={t.ownerHint}
          items={Object.fromEntries(
            options.owners.map((owner) => [owner.personId, owner.name]),
          )}
          defaultValue={contract?.ownerPersonId ?? options.owners[0]?.personId}
        />
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <OptionSelect
          name="projectId"
          label={optional(t.project)}
          items={{
            none: t.projectNone,
            ...Object.fromEntries(options.projects.map((p) => [p.id, p.title])),
          }}
          defaultValue={contract?.projectId ?? "none"}
        />
        <OptionSelect
          name="artistId"
          label={optional(t.artist)}
          items={{
            none: t.artistNone,
            ...Object.fromEntries(options.artists.map((a) => [a.id, a.name])),
          }}
          defaultValue={contract?.artistId ?? "none"}
        />
      </div>
      <Field
        name="dueOn"
        type="date"
        label={optional(t.dueOn)}
        hint={t.dueOnHint}
        defaultValue={contract?.dueOn ?? ""}
        className="h-10 w-fit text-base md:text-sm"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="startsOn"
          type="date"
          label={optional(t.startsOn)}
          defaultValue={contract?.startsOn ?? ""}
          className="h-10 w-fit text-base md:text-sm"
        />
        <Field
          name="endsOn"
          type="date"
          label={optional(t.endsOn)}
          defaultValue={contract?.endsOn ?? ""}
          error={error?.field === "endsOn" ? error.error : undefined}
          className="h-10 w-fit text-base md:text-sm"
        />
      </div>
      <TextareaField
        name="notes"
        label={optional(t.notes)}
        maxLength={4000}
        rows={3}
        placeholder={t.notesPlaceholder}
        defaultValue={contract?.notes ?? ""}
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

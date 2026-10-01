"use client";

import { useActionState, useEffect, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChipChoice, ChipMultiChoice } from "@/components/ui/chip-choice";
import { fr } from "@/lib/i18n/fr";
import { saveNetworkContact } from "@/lib/network/actions";
import {
  NETWORK_KINDS,
  NETWORK_ROLES,
  type NetworkContactValues,
  type NetworkFormOptions,
  type NetworkKind,
} from "@/lib/network/types";

/**
 * A network contact, created or edited in the modal: a person or an
 * organization, its roles, then how to reach it. A person may belong to an
 * organization of the network; a contact may stand for a catalog artist.
 */
export function ContactForm({
  contact,
  options,
  onSaved,
  onCancel,
}: {
  // Absent: a new contact.
  contact?: NetworkContactValues;
  options: NetworkFormOptions;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const t = fr.network.form;
  const [state, formAction, pending] = useActionState(saveNetworkContact, null);
  const [kind, setKind] = useState<NetworkKind>(contact?.kind ?? "person");

  useEffect(() => {
    if (state?.ok) onSaved(state.id);
    // onSaved changes with each render of the parent; the result is what counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const error = state && !state.ok ? state : null;
  // Another organization than itself (a contact never belongs to itself).
  const organizations = options.organizations.filter(
    (organization) => organization.id !== contact?.id,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {contact && <input type="hidden" name="id" value={contact.id} />}
      <ChipChoice
        name="kind"
        legend={t.kind}
        options={NETWORK_KINDS.map((value) => ({
          value,
          label: fr.network.kinds[value],
        }))}
        value={kind}
        onChange={(value) => value && setKind(value)}
      />
      <Field
        name="name"
        label={t.name}
        required
        maxLength={200}
        autoComplete="off"
        placeholder={t.namePlaceholder[kind]}
        defaultValue={contact?.name}
        error={error?.field === "name" ? error.error : undefined}
      />
      <ChipMultiChoice
        name="roles"
        legend={t.roles}
        hint={t.rolesHint}
        options={NETWORK_ROLES.map((value) => ({
          value,
          label: fr.network.roles[value],
        }))}
        defaultValue={contact?.roles ?? []}
        error={error?.field === "roles" ? error.error : undefined}
      />
      {kind === "person" && organizations.length > 0 && (
        <OptionSelect
          name="parentId"
          label={`${t.parent} · ${t.parentNote}`}
          hint={t.parentHint}
          items={{
            none: t.parentNone,
            ...Object.fromEntries(organizations.map((o) => [o.id, o.name])),
          }}
          defaultValue={contact?.parentId ?? "none"}
        />
      )}
      {options.artists.length > 0 && (
        <OptionSelect
          name="artistId"
          label={`${t.artist} · ${t.artistNote}`}
          hint={t.artistHint}
          items={{
            none: t.artistNone,
            ...Object.fromEntries(options.artists.map((a) => [a.id, a.name])),
          }}
          defaultValue={contact?.artistId ?? "none"}
        />
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="email"
          type="email"
          label={`${t.email} · ${t.optional}`}
          autoComplete="off"
          maxLength={320}
          defaultValue={contact?.email ?? ""}
          error={error?.field === "email" ? error.error : undefined}
        />
        <Field
          name="phone"
          type="tel"
          label={`${t.phone} · ${t.optional}`}
          autoComplete="off"
          maxLength={40}
          defaultValue={contact?.phone ?? ""}
        />
        <Field
          name="website"
          type="url"
          inputMode="url"
          label={`${t.website} · ${t.optional}`}
          autoComplete="off"
          maxLength={500}
          placeholder={t.websitePlaceholder}
          defaultValue={contact?.website ?? ""}
          error={error?.field === "website" ? error.error : undefined}
        />
        <Field
          name="city"
          label={`${t.city} · ${t.optional}`}
          autoComplete="off"
          maxLength={120}
          defaultValue={contact?.city ?? ""}
        />
      </div>
      <TextareaField
        name="notes"
        label={`${t.notes} · ${t.optional}`}
        maxLength={2000}
        rows={3}
        placeholder={t.notesPlaceholder}
        defaultValue={contact?.notes ?? ""}
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
          {pending ? t.pending : contact ? t.submitEdit : t.submitCreate}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import {
  idleContactFormState,
  type ArtistContact,
  type ContactRole,
} from "@/lib/catalog/contacts";
import { saveContact } from "@/lib/catalog/profile-actions";
import { fr } from "@/lib/i18n/fr";

// Adds a contact, or edits `contact`. Closes itself once saved. `defaults`
// pre-fills a new contact (one proposed by PO, reviewed before saving).
export function ContactForm({
  artistId,
  contact,
  defaults,
  onDone,
}: {
  artistId: string;
  contact: ArtistContact | null;
  defaults?: {
    role?: ContactRole;
    name?: string;
    email?: string | null;
    phone?: string | null;
  };
  onDone: () => void;
}) {
  const t = fr.catalog.contacts;
  const [state, action] = useActionState(saveContact, idleContactFormState);
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const value = (field: string, fallback: string | null | undefined) =>
    values[field] ?? fallback ?? "";

  useEffect(() => {
    if (state.status === "saved") onDone();
    // onDone changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="artistId" value={artistId} />
      {contact && <input type="hidden" name="contactId" value={contact.id} />}

      <OptionSelect
        name="role"
        label={t.form.role}
        items={t.roles}
        defaultValue={value(
          "role",
          contact?.role ?? defaults?.role ?? "manager",
        )}
        error={errors.role}
      />
      <Field
        name="name"
        label={t.form.name}
        required
        autoFocus
        autoComplete="off"
        maxLength={200}
        defaultValue={value("name", contact?.name ?? defaults?.name)}
        error={errors.name}
      />
      <Field
        name="email"
        type="email"
        label={t.form.email}
        hint={t.form.optional}
        inputMode="email"
        autoComplete="off"
        maxLength={320}
        defaultValue={value("email", contact?.email ?? defaults?.email)}
        error={errors.email}
      />
      <Field
        name="phone"
        type="tel"
        label={t.form.phone}
        hint={t.form.optional}
        inputMode="tel"
        autoComplete="off"
        maxLength={40}
        defaultValue={value("phone", contact?.phone ?? defaults?.phone)}
        error={errors.phone}
      />
      {/* Already primary: stays so until another contact takes the place. */}
      {!contact?.isPrimary && (
        <label className="flex min-h-11 items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="isPrimary"
            className="size-4 accent-selection"
            defaultChecked={values.isPrimary === "on"}
          />
          {t.form.isPrimary}
        </label>
      )}

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {t.form.cancel}
        </Button>
        <SubmitButton pendingLabel={t.form.submitting}>
          {t.form.submit}
        </SubmitButton>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";

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
import { catalog } from "@/lib/i18n/fr/catalog";
import { Checkbox } from "@/components/ui/checkbox";

import { ContactPersonFields } from "./contact-person-fields";

const fr = { catalog };

// Adds a contact, or edits `contact`. Closes itself once saved. `defaults`
// pre-fills a new contact (one proposed by PO, reviewed before saving). The
// person is picked in the Réseau (UX test of 09/10/2026), their email and
// phone filled from their fiche.
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
  const [role, setRole] = useState<ContactRole>(
    (values.role as ContactRole | undefined) ??
      contact?.role ??
      defaults?.role ??
      "manager",
  );

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
        required
        items={t.roles}
        defaultValue={role}
        onValueChange={(next) => setRole(next as ContactRole)}
        error={errors.role}
      />
      <ContactPersonFields
        // Remounted when the server sends the typed values back.
        key={values.name ?? ""}
        role={role}
        required
        defaultNetworkId={
          values.networkContactId ?? contact?.networkContactId ?? null
        }
        defaultName={value("name", contact?.name ?? defaults?.name) || null}
        defaultEmail={value("email", contact?.email ?? defaults?.email)}
        defaultPhone={value("phone", contact?.phone ?? defaults?.phone)}
        errors={{ name: errors.name, email: errors.email, phone: errors.phone }}
      />
      {/* Already primary: stays so until another contact takes the place. */}
      {!contact?.isPrimary && (
        <label className="flex min-h-11 items-center gap-2.5 text-sm">
          <Checkbox
            name="isPrimary"
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

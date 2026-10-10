"use client";

import { useActionState, useEffect, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ContactSocialsFields } from "@/components/network/contact-socials-fields";
import { ParentOrganizationField } from "@/components/network/parent-organization-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { fr } from "@/lib/i18n/fr";
import { normalizeSearch } from "@/lib/utils/search";
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
 * organization of the network (picked, or added on the spot); a contact may
 * stand for a catalog artist, chosen when editing only (never listed at
 * creation). At creation, a person named exactly as an artist of the catalog
 * is linked to it, said on screen and removable (UX test of 09/10/2026:
 * « Artiste du catalogue : Aucun » for the namesake of the title's artist).
 */
export function ContactForm({
  contact,
  initial,
  stay = false,
  options,
  onSaved,
  onCancel,
}: {
  // Absent: a new contact.
  contact?: NetworkContactValues;
  // A new contact already filled: a credit of a title (name and roles), a
  // draft of PO, or an artist spotted on TikTok in the Labo.
  initial?: Partial<Omit<NetworkContactValues, "id">>;
  // Created from another page: stay there instead of opening the contact.
  stay?: boolean;
  options: NetworkFormOptions;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const t = fr.network.form;
  const [state, formAction, pending] = useActionState(saveNetworkContact, null);
  const [kind, setKind] = useState<NetworkKind>(
    contact?.kind ?? initial?.kind ?? "person",
  );
  const [name, setName] = useState(contact?.name ?? initial?.name ?? "");
  const [unlinked, setUnlinked] = useState(false);
  // The catalog artist of the same name, found by the code (never by PO).
  const namesake =
    !contact && !initial?.artistId && kind === "person" && name.trim()
      ? (options.artists.find(
          (a) => normalizeSearch(a.name) === normalizeSearch(name),
        ) ?? null)
      : null;

  useEffect(() => {
    if (state?.ok) onSaved(state.id);
    // onSaved changes with each render of the parent; the result is what counts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const error = state && !state.ok ? state : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {contact && <input type="hidden" name="id" value={contact.id} />}
      {stay && <input type="hidden" name="stay" value="1" />}
      <ChipChoice
        name="kind"
        legend={t.kind}
        required
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
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={error?.field === "name" ? error.error : undefined}
      />
      {namesake && (
        <ArtistNamesake
          artist={namesake}
          linked={!unlinked}
          onToggle={() => setUnlinked((value) => !value)}
        />
      )}
      <OptionSelect
        multiple
        name="roles"
        label={t.roles}
        required
        placeholder={t.rolesPlaceholder}
        items={Object.fromEntries(
          NETWORK_ROLES.map((value) => [value, fr.network.roles[value]]),
        )}
        defaultValue={contact?.roles ?? initial?.roles ?? []}
        // The database accepts up to 8 roles (network_contacts_roles_check).
        max={8}
        error={error?.field === "roles" ? error.error : undefined}
      />
      {kind === "person" && (
        <ParentOrganizationField
          contactId={contact?.id}
          organizations={options.organizations}
          defaultId={contact?.parentId ?? initial?.parentId ?? null}
        />
      )}
      {/* Creation never lists the catalog's artists (Sacha, 10/10/2026): a
          link found by PO's draft is kept as is, the rest is set by editing. */}
      {!contact && initial?.artistId && (
        <input type="hidden" name="artistId" value={initial.artistId} />
      )}
      {namesake && !unlinked && (
        <input type="hidden" name="artistId" value={namesake.id} />
      )}
      {contact && options.artists.length > 0 && (
        <OptionSelect
          name="artistId"
          label={t.artist}
          items={{
            none: t.artistNone,
            ...Object.fromEntries(options.artists.map((a) => [a.id, a.name])),
          }}
          defaultValue={contact?.artistId ?? initial?.artistId ?? "none"}
        />
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="email"
          type="email"
          label={t.email}
          autoComplete="off"
          maxLength={320}
          defaultValue={contact?.email ?? initial?.email ?? ""}
          error={error?.field === "email" ? error.error : undefined}
        />
        <Field
          name="phone"
          type="tel"
          label={t.phone}
          autoComplete="off"
          maxLength={40}
          defaultValue={contact?.phone ?? initial?.phone ?? ""}
        />
        <Field
          name="website"
          type="url"
          inputMode="url"
          label={t.website}
          autoComplete="off"
          maxLength={500}
          placeholder={t.websitePlaceholder}
          defaultValue={contact?.website ?? initial?.website ?? ""}
          error={error?.field === "website" ? error.error : undefined}
        />
        <Field
          name="city"
          label={t.city}
          autoComplete="off"
          maxLength={120}
          defaultValue={contact?.city ?? initial?.city ?? ""}
        />
      </div>
      <ContactSocialsFields values={contact ?? initial} error={error} />
      <TextareaField
        name="notes"
        label={t.notes}
        maxLength={2000}
        rows={3}
        placeholder={t.notesPlaceholder}
        defaultValue={contact?.notes ?? initial?.notes ?? ""}
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

function ArtistNamesake({
  artist,
  linked,
  onToggle,
}: {
  artist: { id: string; name: string };
  linked: boolean;
  onToggle: () => void;
}) {
  const t = fr.network.form;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-3 py-2.5"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium">
          {linked ? t.artistLinked(artist.name) : t.artistUnlinked}
        </span>
        {linked && (
          <span className="text-xs text-muted-foreground">
            {t.artistLinkedHint}
          </span>
        )}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onToggle}>
        {linked ? t.artistUnlink : t.artistRelink(artist.name)}
      </Button>
    </div>
  );
}

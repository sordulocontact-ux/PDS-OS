"use client";

import { useActionState, useEffect, useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import {
  ArtistNamesake,
  DuplicateNotice,
  KindChangeNotice,
} from "@/components/network/contact-form-notices";
import { ContactDetailsFields } from "@/components/network/contact-details-fields";
import { ContactPictureField } from "@/components/network/contact-picture-field";
import { ParentOrganizationField } from "@/components/network/parent-organization-field";
import { useKindRoles } from "@/components/network/use-kind-roles";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { network } from "@/lib/i18n/fr/network";
import { normalizeSearch } from "@/lib/utils/search";
import { saveNetworkContact } from "@/lib/network/actions";
import { similarContacts } from "@/lib/network/similar";
import {
  fitsKind,
  NETWORK_KINDS,
  NETWORK_RELATIONS,
  networkRolesOf,
  rolesOfKind,
  rolesText,
  type NetworkContactValues,
  type NetworkFormOptions,
  type NetworkKind,
  type NetworkRole,
} from "@/lib/network/types";

const fr = { network };

/**
 * A network contact, created or edited in the modal: a person or an
 * organization, what it does (its kind's roles: « métiers » or
 * « activités ») and how PDS works with it (relation types), then how to
 * reach it; only the kind and the name are required (ticket « Retour PO /
 * Réseau » of 11/10/2026). A person may belong to an organization of the
 * network (picked, or added on the spot) and stand for a catalog artist,
 * chosen when editing only (never listed at creation); an organization has
 * neither. At creation, a person named exactly as an artist of the catalog
 * is linked to it, said on screen and removable (UX test of 09/10/2026), and
 * contacts of the same name are said, never blocking. A change of kind of a
 * saved contact says what goes with it before saving. Its picture is chosen
 * here or taken on saving from its Spotify, Deezer, TikTok or Instagram
 * (retour d'Ibé du 01/11/2026; an artist's Spotify first, Sacha 06/11/2026),
 * shown before saving when `initial` brings it (the Repérage). One column; the details the contact does not have yet are
 * « + » buttons under the fields (ContactDetailsFields, Sacha 05/11/2026:
 * « trop d'informations d'un coup »). No helper text under the fields.
 */
export function ContactForm({
  contact,
  initial,
  stay = false,
  options,
  onSaved,
  onCancel,
}: {
  // Absent: a new contact. `memberCount`: people attached to an organization.
  contact?: NetworkContactValues & { memberCount?: number };
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
  const startRoles = contact?.roles ?? initial?.roles ?? [];
  const { kind, setKind, roles, setRoles, aside } = useKindRoles(
    contact?.kind ?? initial?.kind ?? kindOfRoles(startRoles),
    startRoles,
  );
  const [name, setName] = useState(contact?.name ?? initial?.name ?? "");
  const [unlinked, setUnlinked] = useState(false);
  const duplicates = contact ? [] : similarContacts(name, options.contacts);
  // A role held before the per-kind lists stays listed while chosen.
  const roleItems = [
    ...rolesOfKind(kind),
    ...roles.filter((role) => !fitsKind(role, kind)),
  ];
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
      {(contact ? kind !== contact.kind : aside.length > 0) && (
        <KindChangeNotice
          saved={!!contact}
          kind={kind}
          roles={aside.length > 0 ? rolesText(aside) : null}
          parentName={
            contact?.parentId
              ? (options.organizations.find((o) => o.id === contact.parentId)
                  ?.name ?? null)
              : null
          }
          artistName={
            contact?.artistId
              ? (options.artists.find((a) => a.id === contact.artistId)?.name ??
                null)
              : null
          }
          memberCount={contact?.memberCount ?? 0}
        />
      )}
      <ContactPictureField
        name={name}
        kind={kind}
        pictureUrl={contact?.pictureUrl ?? initial?.pictureUrl ?? null}
        pictureSource={contact?.pictureSource ?? initial?.pictureSource ?? null}
        error={error?.field === "picture" ? error.error : undefined}
      >
        <Field
          name="name"
          label={t.nameLabel[kind]}
          required
          maxLength={200}
          autoComplete="off"
          placeholder={t.namePlaceholder[kind]}
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={error?.field === "name" ? error.error : undefined}
        />
      </ContactPictureField>
      {duplicates.length > 0 && (
        <DuplicateNotice matches={duplicates} newTab={stay} />
      )}
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
        label={t.roles[kind]}
        placeholder={t.rolesPlaceholder[kind]}
        items={Object.fromEntries(
          roleItems.map((value) => [value, fr.network.roles[value]]),
        )}
        value={roles}
        onValueChange={(value) => setRoles(networkRolesOf(value))}
        // The database accepts up to 8 roles (network_contacts_roles_check).
        max={8}
      />
      <OptionSelect
        multiple
        name="relations"
        label={t.relations}
        placeholder={t.relationsPlaceholder}
        items={Object.fromEntries(
          NETWORK_RELATIONS.map((value) => [
            value,
            fr.network.relations[value],
          ]),
        )}
        defaultValue={contact?.relations ?? initial?.relations ?? []}
      />
      {kind === "person" && (
        <ParentOrganizationField
          contactId={contact?.id}
          organizations={options.organizations}
          defaultId={contact?.parentId ?? initial?.parentId ?? null}
        />
      )}
      {contact && kind === "person" && options.artists.length > 0 && (
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
      {/* Creation never lists the catalog's artists (Sacha, 10/10/2026): a
          link found by PO's draft is kept as is, the rest is set by editing. */}
      {!contact && kind === "person" && initial?.artistId && (
        <input type="hidden" name="artistId" value={initial.artistId} />
      )}
      {namesake && !unlinked && (
        <input type="hidden" name="artistId" value={namesake.id} />
      )}
      <ContactDetailsFields values={contact ?? initial} error={error} />
      {error && !error.field && (
        <FormMessage kind="error">{error.error}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-[color:var(--border-hairline)] pt-5 sm:flex-row sm:justify-end">
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

// A contact filled from elsewhere without a kind (a credit, a borrowing):
// an organization when every role is an organization's.
function kindOfRoles(roles: readonly NetworkRole[]): NetworkKind {
  return roles.length > 0 &&
    roles.every(
      (role) => !fitsKind(role, "person") && fitsKind(role, "organization"),
    )
    ? "organization"
    : "person";
}

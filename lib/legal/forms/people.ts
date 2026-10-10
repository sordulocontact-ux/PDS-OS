// Who a fiche de renseignements goes to: each person credited on the
// project's titles, once (by name, across titles), with the credits to link
// to their contact when it is created for the fiche, a namesake of the
// Réseau when there is one (it is linked first, by a human: « Relier »),
// and the roles their credits already say (to pre-tick,
// « Les rôles préremplis viennent du cadrage et restent corrigeables »).
// Catalog performers are not here (their artist page is their source),
// except a featured artist: a performer the label contracts with (UX test of
// 09/10/2026: Maya, featured, was only « Auteur » and the performer template
// was offered to no one). It joins through the contact linked to its artist
// page (never by name), or waits to be added to the Réseau. The people of
// the Réseau added to the legal file without a credit follow (ticket
// « Architecture globale », lot 6), with the role chosen for them. A main
// artist who is also credited (an author who sings) has the performer role
// ticked on their fiche, through the same contact (UX test of 09/10/2026,
// section 8: « Artiste interprète » not pre-ticked). Pure.

import type { ContributorRole } from "@/lib/catalog/master/rules";
import type { FormRole } from "@/lib/legal/forms/definition";
import type { InventoryRows } from "@/lib/legal/inventory-rows";
import { NETWORK_ROLE_OF } from "@/lib/legal/people-facts";
import type { NetworkRole } from "@/lib/network/types";
import { normalizeSearch } from "@/lib/utils/search";

const FORM_ROLE_OF: Record<ContributorRole, FormRole> = {
  composer: "composer",
  lyricist: "author",
  arranger: "arranger",
  producer: "producer",
  co_producer: "producer",
  recording_engineer: "provider",
  mix_engineer: "provider",
  mastering_engineer: "provider",
  musician: "musician",
  other: "other",
};

export type FormPerson = {
  key: string;
  name: string;
  contactId: string | null;
  // Credits not linked to a contact yet: linked to the contact created for
  // the fiche (never to an existing one: that is « Relier »).
  unlinkedCreditIds: string[];
  // No contact, but the Réseau has someone of that name: no fiche (it would
  // create a duplicate) until the credits are linked.
  namesakeId: string | null;
  creditRoles: ContributorRole[];
  formRoles: FormRole[];
  networkRoles: NetworkRole[];
  // A featured artist whose page no contact is linked to yet: added to the
  // Réseau (linked to the artist) before any fiche.
  artistId: string | null;
  // The artist page the person performs as on the project's titles: its
  // name (« nom d'artiste », « nom à créditer ») and whether featured.
  performer: { name: string; featuring: boolean } | null;
};

export type FeaturedArtist = {
  artistId: string;
  name: string;
  // The contact linked to the artist page, if any.
  contact: { id: string; name: string } | null;
  titles: string[];
};

/** Featured artists of the project's titles, once each, in title order. */
export function featuredArtists(rows: InventoryRows): FeaturedArtist[] {
  const featured = new Map<string, FeaturedArtist>();
  for (const master of rows.titles)
    for (const performer of rows.performersOf.get(master.id) ?? []) {
      if (!performer.featuring || !performer.artistId) continue;
      const entry = featured.get(performer.artistId) ?? {
        artistId: performer.artistId,
        name: performer.name,
        contact: rows.network.byArtist.get(performer.artistId) ?? null,
        titles: [],
      };
      if (!entry.titles.includes(master.title)) entry.titles.push(master.title);
      featured.set(performer.artistId, entry);
    }
  return [...featured.values()];
}

/** The key of a featured artist's person in formPeople. */
export const featuredKey = (artist: FeaturedArtist) =>
  artist.contact ? `contact:${artist.contact.id}` : `artist:${artist.artistId}`;

function addOnce<T>(list: T[], value: T) {
  if (!list.includes(value)) list.push(value);
}

export function formPeople(rows: InventoryRows): FormPerson[] {
  const people = new Map<string, FormPerson>();
  for (const master of rows.titles)
    for (const credit of rows.creditsOf.get(master.id) ?? []) {
      const key = normalizeSearch(credit.name);
      const person = people.get(key) ?? {
        key,
        name: credit.name,
        contactId: null,
        unlinkedCreditIds: [],
        namesakeId: null,
        creditRoles: [],
        formRoles: [],
        networkRoles: [],
        artistId: null,
        performer: null,
      };
      person.contactId ??= credit.contactId;
      if (!credit.contactId) person.unlinkedCreditIds.push(credit.id);
      addOnce(person.creditRoles, credit.role);
      addOnce(person.formRoles, FORM_ROLE_OF[credit.role]);
      addOnce(person.networkRoles, NETWORK_ROLE_OF[credit.role]);
      people.set(key, person);
    }
  for (const person of people.values())
    if (!person.contactId)
      person.namesakeId = rows.network.byName.get(person.key)?.id ?? null;
  const credited = new Set(
    [...people.values()].flatMap((p) => (p.contactId ? [p.contactId] : [])),
  );
  const added = rows.projectContacts
    .filter((contact) => !credited.has(contact.contactId))
    .map((contact): FormPerson => ({
      key: `contact:${contact.contactId}`,
      name: contact.name,
      contactId: contact.contactId,
      unlinkedCreditIds: [],
      namesakeId: null,
      creditRoles: [],
      formRoles: [contact.role],
      networkRoles: [],
      artistId: null,
      performer: null,
    }));
  const all = [...people.values(), ...added];
  // Featured artists: a performer role on the person of their contact, or
  // a person of their own.
  for (const artist of featuredArtists(rows)) {
    const same = artist.contact
      ? all.find((p) => p.contactId === artist.contact!.id)
      : undefined;
    if (same) {
      addOnce(same.formRoles, "performer");
      addOnce(same.networkRoles, "artist");
      same.performer = { name: artist.name, featuring: true };
      continue;
    }
    all.push({
      key: featuredKey(artist),
      name: artist.contact?.name ?? artist.name,
      contactId: artist.contact?.id ?? null,
      unlinkedCreditIds: [],
      namesakeId: null,
      creditRoles: [],
      formRoles: ["performer"],
      networkRoles: ["artist"],
      artistId: artist.contact ? null : artist.artistId,
      performer: { name: artist.name, featuring: true },
    });
  }
  // Main artists stay off the list (their contracts and roles are not
  // changed here), but one who is credited (by the contact linked to their
  // artist page) is known as the performer they are, for their fiche.
  for (const master of rows.titles)
    for (const performer of rows.performersOf.get(master.id) ?? []) {
      if (performer.featuring || !performer.artistId) continue;
      const contact = rows.network.byArtist.get(performer.artistId);
      const same = contact && all.find((p) => p.contactId === contact.id);
      if (same && !same.performer)
        same.performer = { name: performer.name, featuring: false };
    }
  return all;
}

/** The roles ticked on the person's fiche: their credits, and performer for
 * an artist of the titles. */
export function formRolesOf(person: FormPerson): FormRole[] {
  return person.performer && !person.formRoles.includes("performer")
    ? [...person.formRoles, "performer"]
    : person.formRoles;
}

/** What the fiche already knows of the person's contribution, to confirm
 * rather than type (keys of FORM_FIELDS). Their own earlier answers win. */
export function formAnswersOf(person: FormPerson): Record<string, string> {
  const performer = person.performer;
  return {
    credit_name: performer?.name ?? person.name,
    ...(performer
      ? {
          pseudonym: performer.name,
          category: performer.featuring ? "featuring" : "main",
        }
      : {}),
  };
}

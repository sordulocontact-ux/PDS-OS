// Whether a credit of a title is a contact of the Réseau, shared by the
// Juridique (Personnes) and the Master (Mix et mastering). Pure, from rows
// already read: a credit is known once linked (master_contributors.
// contact_id); a contact of the same name only suggests the link, it never
// settles it (docs/ARCHITECTURE.md § 8 sexies). The same person is often
// credited on several titles of a project: one decision ("Ajouter au
// Réseau", "Relier") links every unlinked credit of that name, said in the
// interface, never a credit already linked elsewhere.

import type { PeekTarget } from "@/lib/peek/types";
import { routes } from "@/lib/auth/redirects";
import type { FactStatus } from "@/lib/facts/types";
import { facts } from "@/lib/i18n/fr/facts";
import type { NetworkRole } from "@/lib/network/types";
import { normalizeSearch } from "@/lib/utils/search";

const fr = { facts };

/** A credit to link to a contact. */
export type CreditLink = { masterId: string; contributorId: string };

/** What a row offers about the Réseau, decided by the server. */
export type CreditContactAction =
  // A person missing from the Réseau: the contact form, already filled; the
  // credits of that name are linked once it is added (none from a section's
  // header).
  | {
      kind: "add_to_network";
      name: string;
      roles: NetworkRole[];
      links: CreditLink[];
      // A featured artist: the new contact is linked to its artist page.
      artistId?: string;
    }
  // Credits whose name matches a contact: link them (never automatic).
  | {
      kind: "link_contact";
      links: CreditLink[];
      contactId: string;
      contactName: string;
    };

/**
 * The unlinked credits of a scope (a project's titles), by normalized name:
 * what one decision about a person links at once.
 */
export function unlinkedCreditsByName(
  credits: Array<{
    id: string;
    masterId: string;
    name: string;
    contactId: string | null;
  }>,
): Map<string, CreditLink[]> {
  const byName = new Map<string, CreditLink[]>();
  for (const credit of credits) {
    if (credit.contactId) continue;
    const key = normalizeSearch(credit.name);
    const link = { masterId: credit.masterId, contributorId: credit.id };
    byName.set(key, [...(byName.get(key) ?? []), link]);
  }
  return byName;
}

/** Contacts of the Réseau by normalized name: a namesake only suggests the
 * contact to link a credit to. `byArtist`: the contact linked to an artist
 * of the catalog (network_contacts.artist_id), a real link. */
export type NetworkIndex = {
  byName: Map<string, { id: string; name: string }>;
  byArtist: Map<string, { id: string; name: string }>;
};

export function networkIndex(
  contacts: Array<{ id: string; name: string; artist_id?: string | null }>,
): NetworkIndex {
  return {
    byName: new Map(contacts.map((c) => [normalizeSearch(c.name), c])),
    byArtist: new Map(
      contacts.flatMap((c) =>
        c.artist_id ? [[c.artist_id, { id: c.id, name: c.name }]] : [],
      ),
    ),
  };
}

export type CreditRights = {
  // manage_network: add a contact.
  addToNetwork: boolean;
  // manage_catalog: link a credit to a contact.
  link: boolean;
};

export type CreditContactState = {
  status: FactStatus;
  statusLabel: string;
  href: string;
  action?: CreditContactAction;
  // The Réseau's person, previewed on the page (RecordPeekDialog).
  peek?: PeekTarget;
};

/**
 * A credit and the Réseau: linked → known; a namesake → to confirm, with
 * "Relier"; nobody → to confirm, with "Ajouter au Réseau" (the role is
 * only a proposal, the form lets the user change it).
 */
export function creditContactState(
  credit: {
    id: string;
    masterId: string;
    name: string;
    contactId: string | null;
  },
  network: NetworkIndex,
  rights: CreditRights,
  suggestedRole: NetworkRole,
  // The scope's unlinked credits by name (unlinkedCreditsByName); without
  // it, only this credit is linked.
  sameName?: Map<string, CreditLink[]>,
): CreditContactState {
  const t = fr.facts.states;
  if (credit.contactId)
    return {
      status: "known",
      statusLabel: t.inNetwork,
      href: routes.networkContact(credit.contactId),
      peek: { kind: "contact", id: credit.contactId },
    };
  const key = normalizeSearch(credit.name);
  const links = sameName?.get(key) ?? [
    { masterId: credit.masterId, contributorId: credit.id },
  ];
  const namesake = network.byName.get(key);
  if (namesake)
    return {
      status: "to_confirm",
      statusLabel: t.sameName,
      href: routes.networkContact(namesake.id),
      action: rights.link
        ? {
            kind: "link_contact",
            links,
            contactId: namesake.id,
            contactName: namesake.name,
          }
        : undefined,
    };
  return {
    status: "to_confirm",
    statusLabel: t.notInNetwork,
    href: routes.masterCredits(credit.masterId),
    action:
      rights.addToNetwork && rights.link
        ? {
            kind: "add_to_network",
            name: credit.name,
            roles: [suggestedRole],
            links,
          }
        : undefined,
  };
}

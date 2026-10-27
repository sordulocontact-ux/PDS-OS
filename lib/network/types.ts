// Network contacts (supabase/migrations/20260929000101_network_contacts.sql).
// Client-safe: the lists mirror the database checks.

import { network } from "@/lib/i18n/fr/network";
import type { ContactSocials } from "@/lib/network/socials";

const fr = { network };

export const NETWORK_KINDS = ["person", "organization"] as const;
export type NetworkKind = (typeof NETWORK_KINDS)[number];

// What a person does (« métier ») or an organization does (« activité »),
// ticket « Retour PO / Réseau » of 11/10/2026: two lists, a contact holds
// several of its kind's. « Prestataire » and « Partenaire » are relation
// types now (NETWORK_RELATIONS, migration 20261011200101).
export const NETWORK_ROLES = [
  // A person's.
  "artist",
  "beatmaker",
  "musician",
  "songwriter",
  "engineer",
  "producer",
  // Who leads the look of a project (« Direction artistique » of the
  // Cadrage's team, migration 20261010000501).
  "art_director",
  "videographer",
  "photographer",
  "designer",
  // UX test of 09/10/2026 (migration 20261010001901).
  "lawyer",
  // Marketing › Activations (migration 20261011000201): a journalist (a
  // person, often of a media of the Réseau) and an influencer, kept once
  // and linked to every campaign.
  "journalist",
  "influencer",
  // A manager, or a management company: both kinds.
  "manager",
  // An organization's.
  "label",
  // A recording studio (migration 20261010001901).
  "studio",
  "agency",
  "production_company",
  // A music publisher (« Éditeur »): who authorises the work of a borrowing
  // (migration 20261007000501).
  "publisher",
  "distributor",
  "media",
  "company",
  "other",
] as const;
export type NetworkRole = (typeof NETWORK_ROLES)[number];

export const PERSON_ROLES: readonly NetworkRole[] = [
  "artist",
  "beatmaker",
  "musician",
  "songwriter",
  "engineer",
  "producer",
  "art_director",
  "videographer",
  "photographer",
  "designer",
  "lawyer",
  "journalist",
  "influencer",
  "manager",
  "other",
];

export const ORGANIZATION_ROLES: readonly NetworkRole[] = [
  "label",
  "studio",
  "agency",
  "production_company",
  "publisher",
  "distributor",
  "media",
  "manager",
  "company",
  "other",
];

const ROLES_OF_KIND: Record<NetworkKind, readonly NetworkRole[]> = {
  person: PERSON_ROLES,
  organization: ORGANIZATION_ROLES,
};

/** The roles the contact form offers for a kind. */
export const rolesOfKind = (kind: NetworkKind) => ROLES_OF_KIND[kind];

export const fitsKind = (role: NetworkRole, kind: NetworkKind) =>
  ROLES_OF_KIND[kind].includes(role);

/** How PDS works with a contact, several at once (never what it does). */
export const NETWORK_RELATIONS = [
  "client",
  "provider",
  "partner",
  "supplier",
] as const;
export type NetworkRelation = (typeof NETWORK_RELATIONS)[number];

export function networkRelationsOf(
  value: readonly string[],
): NetworkRelation[] {
  return value.filter((relation): relation is NetworkRelation =>
    (NETWORK_RELATIONS as readonly string[]).includes(relation),
  );
}

/** "Prestataire, Partenaire": a contact's relation types. */
export function relationsText(relations: readonly NetworkRelation[]): string {
  return relations.map((relation) => fr.network.relations[relation]).join(", ");
}

/**
 * Tabs of the Réseau page (ticket of 11/10/2026): by kind, and the spotted
 * artists (Sacha, 10/10/2026): artists and beatmakers to contact one day,
 * spotted on TikTok in the Labo or added by hand, linked to no catalog
 * artist (signed and collaborating artists are the catalog's).
 */
export const NETWORK_VIEWS = ["people", "organizations", "spotted"] as const;
export type NetworkView = (typeof NETWORK_VIEWS)[number];

export function asNetworkView(value: unknown): NetworkView | null {
  return NETWORK_VIEWS.find((view) => view === value) ?? null;
}

export function inView(contact: NetworkContactRow, view: NetworkView): boolean {
  if (view === "people") return contact.kind === "person";
  if (view === "organizations") return contact.kind === "organization";
  return (
    contact.artistId === null &&
    contact.roles.some((role) => role === "artist" || role === "beatmaker")
  );
}

/** The « Métier » filter under the tabs: domains of roles. */
export const NETWORK_DOMAINS = {
  music: [
    "artist",
    "beatmaker",
    "musician",
    "songwriter",
    "engineer",
    "producer",
    "studio",
    "label",
    "publisher",
    "distributor",
  ],
  image: [
    "art_director",
    "videographer",
    "photographer",
    "designer",
    "production_company",
  ],
  press: ["media", "journalist", "influencer", "agency"],
  business: ["manager", "lawyer", "company"],
  other: ["other"],
} as const satisfies Record<string, readonly NetworkRole[]>;
export type NetworkDomain = keyof typeof NETWORK_DOMAINS;
export const NETWORK_DOMAIN_KEYS = Object.keys(
  NETWORK_DOMAINS,
) as NetworkDomain[];

export function asNetworkDomain(value: unknown): NetworkDomain | null {
  return NETWORK_DOMAIN_KEYS.find((domain) => domain === value) ?? null;
}

export function inDomain(
  roles: readonly NetworkRole[],
  domain: NetworkDomain,
): boolean {
  const members: readonly NetworkRole[] = NETWORK_DOMAINS[domain];
  return roles.some((role) => members.includes(role));
}

export function asNetworkRelation(value: unknown): NetworkRelation | null {
  return NETWORK_RELATIONS.find((relation) => relation === value) ?? null;
}

/** "Beatmaker, Musicien·ne": a contact's roles, in the list's order. */
export function rolesText(roles: readonly NetworkRole[]): string {
  return roles.map((role) => fr.network.roles[role]).join(", ");
}

export function networkRolesOf(value: readonly string[]): NetworkRole[] {
  return value.filter((role): role is NetworkRole =>
    (NETWORK_ROLES as readonly string[]).includes(role),
  );
}

/** A row of the Réseau list. */
export type NetworkContactRow = {
  id: string;
  kind: NetworkKind;
  name: string;
  roles: NetworkRole[];
  relations: NetworkRelation[];
  // A person's organization in the network.
  parentName: string | null;
  // The catalog artist the contact stands for: not a spotted artist.
  artistId: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  // Shown when there is no e-mail nor phone: how to reach a spotted artist.
  tiktok: string | null;
};

/** Everything the contact form edits, as saved. */
export type NetworkContactValues = {
  id: string;
  kind: NetworkKind;
  name: string;
  roles: NetworkRole[];
  relations: NetworkRelation[];
  parentId: string | null;
  artistId: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  notes: string | null;
} & ContactSocials;

/** Choices of the contact form: organizations and catalog artists, and
 * every live contact, to tell a namesake before creating a duplicate. */
export type NetworkFormOptions = {
  organizations: { id: string; name: string }[];
  artists: { id: string; name: string }[];
  contacts: { id: string; name: string; kind: NetworkKind }[];
};

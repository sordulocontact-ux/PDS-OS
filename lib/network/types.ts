// Network contacts (supabase/migrations/20260929000101_network_contacts.sql).
// Client-safe: the lists mirror the database checks.

import { fr } from "@/lib/i18n/fr";

export const NETWORK_KINDS = ["person", "organization"] as const;
export type NetworkKind = (typeof NETWORK_KINDS)[number];

export const NETWORK_ROLES = [
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
  "provider",
  "partner",
  "label",
  // A music publisher (« Éditeur »): who authorises the work of a borrowing
  // (migration 20261007000501).
  "publisher",
  "distributor",
  "media",
  "manager",
  "other",
] as const;
export type NetworkRole = (typeof NETWORK_ROLES)[number];

/** Tabs of the Réseau page: role families; a contact sits in each of its. */
export const NETWORK_FAMILIES = {
  music: [
    "artist",
    "beatmaker",
    "musician",
    "songwriter",
    "engineer",
    "producer",
  ],
  image: ["art_director", "videographer", "photographer", "designer"],
  business: [
    "provider",
    "partner",
    "label",
    "publisher",
    "distributor",
    "media",
    "manager",
  ],
  other: ["other"],
} as const satisfies Record<string, readonly NetworkRole[]>;
export type NetworkFamily = keyof typeof NETWORK_FAMILIES;
export const NETWORK_FAMILY_KEYS = Object.keys(
  NETWORK_FAMILIES,
) as NetworkFamily[];

export function asNetworkFamily(value: unknown): NetworkFamily | null {
  return NETWORK_FAMILY_KEYS.find((family) => family === value) ?? null;
}

export function inFamily(
  roles: readonly NetworkRole[],
  family: NetworkFamily,
): boolean {
  const members: readonly NetworkRole[] = NETWORK_FAMILIES[family];
  return roles.some((role) => members.includes(role));
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
  // A person's organization in the network.
  parentName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
};

/** Everything the contact form edits, as saved. */
export type NetworkContactValues = {
  id: string;
  kind: NetworkKind;
  name: string;
  roles: NetworkRole[];
  parentId: string | null;
  artistId: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  notes: string | null;
};

/** Choices of the contact form: organizations and catalog artists. */
export type NetworkFormOptions = {
  organizations: { id: string; name: string }[];
  artists: { id: string; name: string }[];
};

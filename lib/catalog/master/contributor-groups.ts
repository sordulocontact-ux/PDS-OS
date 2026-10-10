// A title's credits as people (UX test of 09/10/2026, section 8: « 2 crédits
// pour une autrice-compositrice »): the data stays one row per role, the
// screen shows and edits one person with all their roles. And the roles a
// person of the Réseau already says they hold (« rôle du crédit non repris
// du contact »). Client-safe, pure.

import {
  CONTRIBUTOR_ROLES,
  type ContributorRole,
  type MasterContributor,
} from "@/lib/catalog/master/rules";
import type { NetworkRole } from "@/lib/network/types";
import { normalizeSearch } from "@/lib/utils/search";

export type ContributorGroup = {
  key: string;
  // Its rows on the title, one per role.
  itemIds: string[];
  name: string;
  contactId: string | null;
  roles: ContributorRole[];
  detail: string | null;
};

const byRole = (a: ContributorRole, b: ContributorRole) =>
  CONTRIBUTOR_ROLES.indexOf(a) - CONTRIBUTOR_ROLES.indexOf(b);

/** One entry per person (their contact, else their name), in the order of
 * their first role. */
export function groupContributors(
  contributors: MasterContributor[],
): ContributorGroup[] {
  const groups = new Map<string, ContributorGroup>();
  for (const c of contributors) {
    const key = c.contactId ?? `name:${normalizeSearch(c.name)}`;
    const group = groups.get(key) ?? {
      key,
      itemIds: [],
      name: c.name,
      contactId: c.contactId,
      roles: [],
      detail: null,
    };
    group.itemIds.push(c.id);
    if (!group.roles.includes(c.role)) group.roles.push(c.role);
    if (c.detail && !group.detail?.split(" · ").includes(c.detail))
      group.detail = group.detail ? `${group.detail} · ${c.detail}` : c.detail;
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, roles: [...g.roles].sort(byRole) }))
    .sort((a, b) => byRole(a.roles[0], b.roles[0]));
}

// What a role of the Réseau says of a credit. An engineer is not mapped:
// recording, mixing or mastering is not known from the Réseau.
const CREDIT_ROLES_OF: Partial<Record<NetworkRole, ContributorRole[]>> = {
  songwriter: ["lyricist", "composer"],
  beatmaker: ["composer", "producer"],
  producer: ["producer"],
  musician: ["musician"],
};

/** The credit roles a contact of the Réseau holds, in the list's order. */
export function creditRolesOf(
  roles: readonly NetworkRole[],
): ContributorRole[] {
  return [...new Set(roles.flatMap((r) => CREDIT_ROLES_OF[r] ?? []))].sort(
    byRole,
  );
}

/** An engineer of the Réseau whose credit role must still be chosen. */
export const engineerToChoose = (roles: readonly NetworkRole[]) =>
  roles.includes("engineer") && creditRolesOf(roles).length === 0;

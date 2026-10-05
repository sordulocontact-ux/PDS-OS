// Rows of the État des lieux's queries turned into the inputs of the fact
// builders, grouped by title. Pure: no database here (inventory-rows.ts).

import {
  CONTRIBUTOR_ROLES,
  DECLARATION_STATUSES,
  ORGANISMS,
  SPLIT_KINDS,
  SPLIT_ROLES,
  oneOf,
  type MasterDeclaration,
  type MasterSplit,
  type Organism,
} from "@/lib/catalog/master/rules";
import type {
  InventoryContributor,
  InventoryPerformer,
} from "@/lib/legal/people-facts";

export function groupBy<T, V>(
  rows: T[],
  key: (row: T) => string,
  value: (row: T) => V,
): Map<string, V[]> {
  const groups = new Map<string, V[]>();
  for (const row of rows) {
    const k = key(row);
    groups.set(k, [...(groups.get(k) ?? []), value(row)]);
  }
  return groups;
}

const rank = (c: InventoryContributor) => CONTRIBUTOR_ROLES.indexOf(c.role);

/** Credits per title, in the roles' order (as on the title's Crédits). */
export function contributorsByTitle(
  rows: Array<{
    id: string;
    master_id: string;
    name: string;
    role: string;
    detail: string | null;
    contact_id: string | null;
  }>,
): Map<string, InventoryContributor[]> {
  const groups = groupBy(
    rows,
    (row) => row.master_id,
    (row): InventoryContributor => ({
      id: row.id,
      name: row.name,
      role: oneOf(CONTRIBUTOR_ROLES, row.role, "other"),
      detail: row.detail,
      contactId: row.contact_id,
    }),
  );
  for (const list of groups.values()) list.sort((a, b) => rank(a) - rank(b));
  return groups;
}

/** Performers per title, in the credits' order (rows sorted by position). */
export function performersByTitle(
  rows: Array<{
    master_id: string;
    role: string;
    artist: { id: string; name: string } | null;
  }>,
): Map<string, InventoryPerformer[]> {
  return groupBy(
    rows.filter((row) => row.artist !== null),
    (row) => row.master_id,
    (row): InventoryPerformer => ({
      artistId: row.artist?.id ?? "",
      name: row.artist?.name ?? "",
      featuring: row.role === "featuring",
    }),
  );
}

export function splitsByTitle(
  rows: Array<{
    id: string;
    master_id: string;
    kind: string;
    party: string;
    role: string;
    share: number | string;
  }>,
): Map<string, MasterSplit[]> {
  return groupBy(
    rows,
    (row) => row.master_id,
    (row): MasterSplit => ({
      id: row.id,
      kind: oneOf(SPLIT_KINDS, row.kind, "master"),
      party: row.party,
      role: oneOf(SPLIT_ROLES, row.role, "other"),
      share: Number(row.share),
    }),
  );
}

/** Declarations per title, keyed by organism (one each at most, in SQL). */
export function declarationsByTitle(
  rows: Array<{
    id: string;
    master_id: string;
    organism: string;
    status: string;
    reference: string | null;
    declared_on: string | null;
    notes: string | null;
  }>,
): Map<string, Map<Organism, MasterDeclaration>> {
  const groups = groupBy(
    rows,
    (row) => row.master_id,
    (row): [Organism, MasterDeclaration] => {
      const organism = oneOf(ORGANISMS, row.organism, "sacem");
      return [
        organism,
        {
          id: row.id,
          organism,
          status: oneOf(DECLARATION_STATUSES, row.status, "submitted"),
          reference: row.reference,
          date: row.declared_on,
          notes: row.notes,
        },
      ];
    },
  );
  return new Map(
    [...groups].map(([masterId, entries]) => [masterId, new Map(entries)]),
  );
}

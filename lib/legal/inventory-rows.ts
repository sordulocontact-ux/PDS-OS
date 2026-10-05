import "server-only";

import type {
  MasterDeclaration,
  MasterSplit,
  Organism,
} from "@/lib/catalog/master/rules";
import { asContractStatus } from "@/lib/contracts/types";
import { networkIndex, type NetworkIndex } from "@/lib/facts/credit-contact";
import {
  contributorsByTitle,
  declarationsByTitle,
  performersByTitle,
  splitsByTitle,
} from "@/lib/legal/inventory-mappers";
import type {
  InventoryContributor,
  InventoryPerformer,
} from "@/lib/legal/people-facts";
import type {
  InventoryContract,
  InventoryFlag,
} from "@/lib/legal/project-facts";
import type { InventoryMaster } from "@/lib/legal/title-facts";
import type { LegalSectionKey } from "@/lib/legal/types";
import { createClient } from "@/lib/supabase/server";

// Every row of the État des lieux in one round of parallel queries, with the
// viewer's session: RLS decides what appears (splits need manage_catalog, a
// contract shows to its readers only). No N+1: the rows of all the project's
// titles come in one query per table.

// The network is the team's directory; far below this for 3 to 5 people.
const NETWORK_LIMIT = 2000;

export type InventoryRows = {
  // In the project's order.
  titles: InventoryMaster[];
  performersOf: Map<string, InventoryPerformer[]>;
  creditsOf: Map<string, InventoryContributor[]>;
  splitsOf: Map<string, MasterSplit[]>;
  filedOf: Map<string, Map<Organism, MasterDeclaration>>;
  network: NetworkIndex;
  contracts: InventoryContract[];
  flags: InventoryFlag[];
  failed: Partial<Record<LegalSectionKey, boolean>>;
};

function failed(scope: string, error: { message: string } | null): boolean {
  if (error) console.error(`readInventoryRows ${scope}:`, error.message);
  return error !== null;
}

export async function readInventoryRows(
  projectId: string,
  // The project's titles in its order, with their credited artists.
  projectMasters: Array<{ id: string; artists: string }>,
  readSplits: boolean,
): Promise<InventoryRows> {
  const supabase = await createClient();
  const masterIds = projectMasters.map((master) => master.id);
  const artistsOf = new Map(projectMasters.map((m) => [m.id, m.artists]));
  const titled = masterIds.length > 0;
  const none = Promise.resolve({ data: [], error: null });

  const [
    masters,
    performers,
    credits,
    splits,
    declarations,
    network,
    contracts,
    flags,
  ] = await Promise.all([
    titled
      ? supabase
          .from("masters")
          .select("id, title, isrc, iswc, rights_holder, rights_year")
          .in("id", masterIds)
      : none,
    titled
      ? supabase
          .from("master_artists")
          .select(
            "master_id, role, artist:artists!master_artists_artist_same_org(id, name)",
          )
          .in("master_id", masterIds)
          .order("position")
      : none,
    titled
      ? supabase
          .from("master_contributors")
          .select("id, master_id, name, role, detail, contact_id")
          .in("master_id", masterIds)
          .order("created_at")
      : none,
    titled && readSplits
      ? supabase
          .from("master_splits")
          .select("id, master_id, kind, party, role, share")
          .in("master_id", masterIds)
      : none,
    titled
      ? supabase
          .from("master_declarations")
          .select(
            "id, master_id, organism, status, reference, declared_on, notes",
          )
          .in("master_id", masterIds)
      : none,
    titled
      ? supabase
          .from("network_contacts")
          .select("id, name")
          .is("archived_at", null)
          .limit(NETWORK_LIMIT)
      : none,
    supabase
      .from("contracts")
      .select(
        "id, title, status, ends_on, updated_at, contract_parties(contact_id, contact:network_contacts!contract_parties_contact_same_org(name))",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("framing_constraints")
      .select("id, text, review_status")
      .eq("project_id", projectId)
      .eq("type", "rights")
      .neq("review_status", "rejected")
      .order("created_at"),
  ]);

  const byId = new Map(
    (masters.data ?? []).map((row): [string, InventoryMaster] => [
      row.id,
      {
        id: row.id,
        title: row.title,
        artists: artistsOf.get(row.id) ?? "",
        position: masterIds.indexOf(row.id),
        isrc: row.isrc,
        iswc: row.iswc,
        rightsHolder: row.rights_holder,
        rightsYear: row.rights_year,
      },
    ]),
  );

  return {
    titles: masterIds.flatMap((id) => byId.get(id) ?? []),
    performersOf: performersByTitle(performers.data ?? []),
    creditsOf: contributorsByTitle(credits.data ?? []),
    splitsOf: splitsByTitle(splits.data ?? []),
    filedOf: declarationsByTitle(declarations.data ?? []),
    network: networkIndex(network.data ?? []),
    contracts: (contracts.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: asContractStatus(row.status),
      endsOn: row.ends_on,
      parties: row.contract_parties
        .flatMap((party) => (party.contact ? [party.contact.name] : []))
        .sort((a, b) => a.localeCompare(b, "fr")),
      partyIds: row.contract_parties.map((party) => party.contact_id),
      updatedAt: row.updated_at,
    })),
    flags: (flags.data ?? []).map((row) => ({
      id: row.id,
      text: row.text,
      proposed: row.review_status === "proposed",
    })),
    failed: {
      titles: failed("masters", masters.error),
      people:
        failed("performers", performers.error) ||
        failed("contributors", credits.error) ||
        failed("network", network.error),
      splits: failed("splits", splits.error),
      agreements: failed("contracts", contracts.error),
      declarations: failed("declarations", declarations.error),
      flags: failed("flags", flags.error),
    },
  };
}

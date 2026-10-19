import "server-only";

import type {
  MasterDeclaration,
  MasterSplit,
  Organism,
} from "@/lib/catalog/master/rules";
import { asContractStatus } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
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
import { FORM_ROLES, type FormRole } from "@/lib/legal/forms/definition";
import type { InventoryMaster } from "@/lib/legal/title-facts";
import type { LegalSectionKey } from "@/lib/legal/types";
import { createClient } from "@/lib/supabase/server";
import { memoPerRequest } from "@/lib/utils/request-memo";

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
  // Parties the Cadrage qualified as needing no new contract (existing, not
  // needed, not applicable), by normalised name (PROJ-BUG-03).
  settledParties: Set<string>;
  // People of the Réseau in the legal file without a credit (lot 6).
  projectContacts: Array<{
    id: string;
    contactId: string;
    name: string;
    role: FormRole;
  }>;
  failed: Partial<Record<LegalSectionKey, boolean>>;
};

function failed(scope: string, error: { message: string } | null): boolean {
  if (error) console.error(`readInventoryRows ${scope}:`, error.message);
  return error !== null;
}

/** Read once per request for the same project, titles and split right:
 * the Juridique's journey reads it from several of its steps (État des
 * lieux, Plan, fiches, contrats, répartitions, Suivi). */
export const readInventoryRows = memoPerRequest(
  (
    projectId: string,
    // The project's titles in its order, with their credited artists.
    projectMasters: Array<{ id: string; artists: string }>,
    readSplits: boolean,
  ) =>
    JSON.stringify([
      projectId,
      projectMasters.map((m) => [m.id, m.artists]),
      readSplits,
    ]),
  readRows,
);

async function readRows(
  projectId: string,
  projectMasters: Array<{ id: string; artists: string }>,
  readSplits: boolean,
): Promise<InventoryRows> {
  const supabase = await createClient();
  const masterIds = projectMasters.map((master) => master.id);
  const artistsOf = new Map(projectMasters.map((m) => [m.id, m.artists]));
  const titled = masterIds.length > 0;
  const none = Promise.resolve({ data: [], error: null });
  // Not legal_parties: the parties are qualified one by one (below), an
  // older free-text answer is no current fact (PROJ-BUG-03).
  const BRIEF_LEGAL_KEYS = [
    "legal_agreements",
    "legal_needs",
    "legal_secured",
  ] as const;

  const [
    masters,
    performers,
    credits,
    splits,
    declarations,
    network,
    contracts,
    flags,
    briefLegal,
    projectContacts,
    legalParties,
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
            "id, master_id, organism, status, reference, declared_on, notes, third_party, proof_file_id",
          )
          .in("master_id", masterIds)
      : none,
    titled
      ? supabase
          .from("network_contacts")
          .select("id, name, artist_id")
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
    // Dimension 06 « Cadre juridique » of the Brief de cadrage: what the
    // Cadrage intelligent confirmed (docs/ARCHITECTURE.md § 6).
    supabase
      .from("current_field_values")
      .select("id, field_key, value, status")
      .eq("project_id", projectId)
      .eq("deliverable", "brief")
      .in("field_key", [...BRIEF_LEGAL_KEYS])
      .in("status", ["confirmed", "proposed"]),
    // Read with manage_legal only (RLS): empty for anyone else.
    supabase
      .from("legal_project_contacts")
      .select(
        "id, contact_id, role, contact:network_contacts!legal_project_contacts_contact_same_org(name)",
      )
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("framing_legal_parties")
      .select("id, party_key, name, document_status")
      .eq("project_id", projectId)
      .order("created_at"),
  ]);
  failed("legal parties", legalParties.error);

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
    projectContacts: (projectContacts.data ?? []).flatMap((row) => {
      const role = FORM_ROLES.find((r) => r === row.role);
      return row.contact && role
        ? [
            {
              id: row.id,
              contactId: row.contact_id,
              name: row.contact.name,
              role,
            },
          ]
        : [];
    }),
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
    flags: [
      ...(flags.data ?? []).map((row) => ({
        id: row.id,
        text: row.text,
        proposed: row.review_status === "proposed",
      })),
      ...(briefLegal.data ?? []).flatMap((row) =>
        typeof row.value === "string" && row.value.trim() && row.id
          ? [
              {
                id: row.id,
                text: `${fr.framingIntel.questions[row.field_key as (typeof BRIEF_LEGAL_KEYS)[number]].label} : ${row.value}`,
                proposed: row.status === "proposed",
              },
            ]
          : [],
      ),
      ...(legalParties.data ?? []).map((row) => ({
        id: row.id,
        text: `${fr.framingIntel.questions.legal_parties.label} : ${row.name} · ${fr.framingIntel.parties.statuses[row.document_status as keyof typeof fr.framingIntel.parties.statuses]}`,
        proposed: false,
      })),
    ],
    settledParties: new Set(
      (legalParties.data ?? [])
        .filter((row) =>
          ["existing", "not_needed", "not_applicable"].includes(
            row.document_status,
          ),
        )
        .map((row) => row.party_key),
    ),
    failed: {
      titles: failed("masters", masters.error),
      people:
        failed("performers", performers.error) ||
        failed("contributors", credits.error) ||
        failed("network", network.error),
      splits: failed("splits", splits.error),
      agreements: failed("contracts", contracts.error),
      declarations: failed("declarations", declarations.error),
      flags: failed("flags", flags.error) || failed("brief", briefLegal.error),
    },
  };
}

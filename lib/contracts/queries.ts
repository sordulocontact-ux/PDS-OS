import "server-only";

import type { Access } from "@/lib/auth/access";
import { can } from "@/lib/auth/access";
import {
  asContractStatus,
  asContractType,
  contractStateOf,
  isContractDue,
  todayInParis,
  type ContractDetail,
  type ContractFormOptions,
  type ContractRow,
} from "@/lib/contracts/types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Read side of contracts, with the viewer's session: RLS shows a contract to
// its owner, the direction and its project's owner only (can_see_contract).

// A team of 3 to 5 people stays far below it.
const LIST_LIMIT = 500;

const SELECT = `id, title, type, status, due_on, ends_on, starts_on, signed_on,
  organization_id, project_id, artist_id, owner_person_id, notes,
  review_comment, reviewed_at,
  owner:people!contracts_owner_person_id_fkey(first_name, last_name),
  reviewer:people!contracts_reviewed_by_fkey(first_name, last_name),
  project:projects!contracts_project_same_org(title),
  artist:artists!contracts_artist_same_org(name),
  contract_parties(contact_id, role, contact:network_contacts!contract_parties_contact_same_org(name, kind))`;

type Client = Awaited<ReturnType<typeof createClient>>;

async function readContracts(supabase: Client, id?: string) {
  const query = supabase.from("contracts").select(SELECT);
  return id
    ? query.eq("id", id).limit(1)
    : query.order("created_at", { ascending: false }).limit(LIST_LIMIT);
}

type Row = NonNullable<
  Awaited<ReturnType<typeof readContracts>>["data"]
>[number];

function toRow(row: Row, today: string): ContractRow {
  const status = asContractStatus(row.status);
  return {
    id: row.id,
    title: row.title,
    type: asContractType(row.type),
    status,
    state: contractStateOf({ status, endsOn: row.ends_on }, today),
    dueOn: row.due_on,
    due: isContractDue({ status, dueOn: row.due_on }, today),
    endsOn: row.ends_on,
    ownerName: row.owner
      ? personName(row.owner.first_name, row.owner.last_name)
      : "",
    projectTitle: row.project?.title ?? null,
    artistName: row.artist?.name ?? null,
    parties: row.contract_parties
      .flatMap((party) => (party.contact ? [party.contact.name] : []))
      .sort((a, b) => a.localeCompare(b, "fr")),
  };
}

/** Contracts the viewer may read, newest first. Null on failure. */
export async function listContracts(): Promise<ContractRow[] | null> {
  const supabase = await createClient();
  const { data, error } = await readContracts(supabase);
  if (error) {
    console.error("listContracts:", error.message);
    return null;
  }
  const today = todayInParis(new Date());
  return data.map((row) => toRow(row, today));
}

/** One contract with its parties and what the viewer may do on it. */
export async function getContract(
  id: string,
  access: Access,
): Promise<ContractDetail | null> {
  const supabase = await createClient();
  const { data, error } = await readContracts(supabase, id);
  if (error) console.error("getContract:", error.message);
  const row = data?.[0];
  if (!row) return null;
  const today = todayInParis(new Date());
  const base = toRow(row, today);

  // Comfort only: advance_contract and RLS decide (can_edit_contract).
  const writer =
    can(access, "manage_contracts") &&
    (row.owner_person_id === access.personId ||
      can(access, "view_all_projects"));
  const status = base.status;
  return {
    ...base,
    organizationId: row.organization_id,
    projectId: row.project_id,
    artistId: row.artist_id,
    ownerPersonId: row.owner_person_id,
    startsOn: row.starts_on,
    signedOn: row.signed_on,
    notes: row.notes,
    reviewComment: row.review_comment,
    reviewerName: row.reviewer
      ? personName(row.reviewer.first_name, row.reviewer.last_name)
      : null,
    reviewedAt: row.reviewed_at,
    partyList: row.contract_parties
      .flatMap((party) =>
        party.contact
          ? [
              {
                contactId: party.contact_id,
                name: party.contact.name,
                kind:
                  party.contact.kind === "organization"
                    ? ("organization" as const)
                    : ("person" as const),
                role: party.role,
              },
            ]
          : [],
      )
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    can: {
      edit: writer && !["in_review", "terminated"].includes(status),
      submit: writer && status === "draft",
      decide: can(access, "validate") && status === "in_review",
      send: writer && status === "approved",
      sign: writer && (status === "approved" || status === "sent"),
      terminate: writer && status === "signed",
    },
  };
}

/**
 * What the contract form offers: its owners (the direction gives a contract
 * to any member following contracts; anyone else follows their own), the
 * visible live projects and the catalog's artists.
 */
export async function loadContractFormOptions(
  access: Access,
): Promise<ContractFormOptions> {
  const supabase = await createClient();
  const [owners, projects, artists] = await Promise.all([
    can(access, "view_all_projects") && access.organizationId
      ? supabase.rpc("list_contract_owners", {
          p_organization_id: access.organizationId,
        })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("projects")
      .select("id, title")
      .is("archived_at", null)
      .order("title")
      .limit(LIST_LIMIT),
    supabase
      .from("artists")
      .select("id, name")
      .is("archived_at", null)
      .order("name")
      .limit(LIST_LIMIT),
  ]);
  const failed = owners.error ?? projects.error ?? artists.error;
  if (failed) console.error("loadContractFormOptions:", failed.message);
  return {
    owners: (owners.data ?? []).map((p) => ({
      personId: p.person_id,
      name: personName(p.first_name, p.last_name),
    })),
    projects: projects.data ?? [],
    artists: artists.data ?? [],
  };
}

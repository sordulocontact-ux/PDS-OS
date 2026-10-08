"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import type { NetworkRole } from "@/lib/network/types";
import { createClient } from "@/lib/supabase/server";

// The longest role a party may have (addContractParty's schema).
const ROLE_MAX = 80;

export type ContractPartyOption = {
  // The contact's id: what addContractParty stores.
  id: string;
  label: string;
  detail?: string;
  // The role in the contract it suggests (what PDS OS knows of that person).
  role: string;
  group: "artist" | "credit" | "network";
};

/**
 * Who may become a party of a contract (Sacha, 07/10/2026: pick, never
 * retype): the contact standing for the contract's artist, the people
 * credited on the titles of its project, then the whole Réseau; never a
 * contact already a party. Read with the user's session (RLS decides).
 */
export async function listContractPartyOptions(
  contractId: string,
): Promise<ContractPartyOption[]> {
  await requireApproved();
  const id = z.uuid().safeParse(contractId);
  if (!id.success) return [];
  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("artist_id, project_id, contract_parties(contact_id)")
    .eq("id", id.data)
    .maybeSingle();
  if (!contract) return [];

  const [artistContacts, titles, contacts] = await Promise.all([
    contract.artist_id
      ? supabase
          .from("network_contacts")
          .select("id")
          .eq("artist_id", contract.artist_id)
          .is("archived_at", null)
      : null,
    contract.project_id
      ? supabase
          .from("project_masters")
          .select("master_id")
          .eq("project_id", contract.project_id)
      : null,
    supabase
      .from("network_contacts")
      .select("id, name, roles")
      .is("archived_at", null)
      .order("name")
      .limit(1000),
  ]);
  const masterIds = (titles?.data ?? []).map((t) => t.master_id);
  const credits = masterIds.length
    ? await supabase
        .from("master_contributors")
        .select("role, contact_id")
        .in("master_id", masterIds)
        .not("contact_id", "is", null)
    : null;

  const t = fr.contracts.parties;
  const creditRoles = fr.masterPage.credits.roles as Record<string, string>;
  const taken = new Set(contract.contract_parties.map((p) => p.contact_id));
  const artistIds = new Set((artistContacts?.data ?? []).map((c) => c.id));
  // Each credited contact's roles on the project's titles, in order.
  const credited = new Map<string, string[]>();
  for (const credit of credits?.data ?? []) {
    if (!credit.contact_id) continue;
    const roles = credited.get(credit.contact_id) ?? [];
    const role = creditRoles[credit.role] ?? credit.role;
    if (!roles.includes(role)) roles.push(role);
    credited.set(credit.contact_id, roles);
  }

  const options = (contacts.data ?? [])
    .filter((c) => !taken.has(c.id))
    .map((c): ContractPartyOption => {
      const networkRoles = (c.roles as NetworkRole[])
        .map((r) => fr.network.roles[r])
        .join(", ");
      if (artistIds.has(c.id))
        return {
          id: c.id,
          label: c.name,
          detail: t.groups.artist,
          role: t.artistRole,
          group: "artist",
        };
      const creditedAs = credited.get(c.id);
      if (creditedAs)
        return {
          id: c.id,
          label: c.name,
          detail: `${t.groups.credit} · ${creditedAs.join(", ")}`,
          role: creditedAs.join(", "),
          group: "credit",
        };
      return {
        id: c.id,
        label: c.name,
        detail: networkRoles,
        role: networkRoles,
        group: "network",
      };
    });
  const rank = { artist: 0, credit: 1, network: 2 } as const;
  return options
    .map((option) => ({ ...option, role: option.role.slice(0, ROLE_MAX) }))
    .sort((a, b) => rank[a.group] - rank[b.group]);
}

"use server";

import { requireApproved } from "@/lib/auth/dal";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import type { HolderRole } from "@/lib/legal/clearance/matrix";
import type { NetworkRole } from "@/lib/network/types";
import { createClient } from "@/lib/supabase/server";

// Who a rights holder of a clearance may be (Sacha, 07/10/2026: picked in
// the Réseau, never typed again): the people credited on the clearance's
// title and the parties of its publishing split first, then the whole
// Réseau, each with the role PDS OS already knows. Read with the user's
// session.

export type HolderOption = {
  id: string;
  label: string;
  detail?: string;
  role: HolderRole | null;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

const ROLE_OF_CREDIT: Record<string, HolderRole> = {
  lyricist: "author",
  composer: "composer",
  producer: "producer",
  co_producer: "producer",
};
const ROLE_OF_SPLIT: Record<string, HolderRole> = {
  author: "author",
  composer: "composer",
  publisher: "publisher",
};
const ROLE_OF_NETWORK: Partial<Record<NetworkRole, HolderRole>> = {
  publisher: "publisher",
  label: "label",
  producer: "producer",
};

/** The contacts already linked to the title: contact id → what they are. */
async function titlePeople(supabase: Supabase, masterId: string | null) {
  const linked = new Map<string, { detail: string; role: HolderRole | null }>();
  if (!masterId) return linked;
  const [credits, splits] = await Promise.all([
    supabase
      .from("master_contributors")
      .select("role, contact_id")
      .eq("master_id", masterId)
      .not("contact_id", "is", null)
      .order("position"),
    supabase
      .from("master_splits")
      .select("role, contact_id")
      .eq("master_id", masterId)
      .eq("kind", "publishing")
      .not("contact_id", "is", null),
  ]);
  const roles = fr.masterPage.credits.roles as Record<string, string>;
  for (const c of credits.data ?? []) {
    if (!c.contact_id) continue;
    const known = linked.get(c.contact_id);
    const role = roles[c.role] ?? c.role;
    linked.set(c.contact_id, {
      detail: known
        ? `${known.detail}, ${role}`
        : `${fr.masterPage.splits.party.credited} · ${role}`,
      role: known?.role ?? ROLE_OF_CREDIT[c.role] ?? null,
    });
  }
  for (const s of splits.data ?? []) {
    if (!s.contact_id || linked.has(s.contact_id)) continue;
    linked.set(s.contact_id, {
      detail: fr.legalClearance.holder.inSplit,
      role: ROLE_OF_SPLIT[s.role] ?? null,
    });
  }
  return linked;
}

export async function listClearanceHolders(
  clearanceId: string,
): Promise<HolderOption[]> {
  await requireApproved();
  const id = catalogIdSchema.safeParse(clearanceId);
  if (!id.success) return [];
  const supabase = await createClient();
  const [clearance, contacts] = await Promise.all([
    supabase
      .from("legal_clearances")
      .select("master_id")
      .eq("id", id.data)
      .maybeSingle(),
    supabase
      .from("network_contacts")
      .select("id, name, roles")
      .is("archived_at", null)
      .order("name")
      .limit(1000),
  ]);
  const linked = await titlePeople(supabase, clearance.data?.master_id ?? null);
  const options = (contacts.data ?? []).map((c): HolderOption => {
    const onTitle = linked.get(c.id);
    const roles = c.roles as NetworkRole[];
    return {
      id: c.id,
      label: c.name,
      detail:
        onTitle?.detail ?? roles.map((r) => fr.network.roles[r]).join(", "),
      role:
        onTitle?.role ??
        roles.map((r) => ROLE_OF_NETWORK[r]).find(Boolean) ??
        null,
    };
  });
  return [
    ...options.filter((o) => linked.has(o.id)),
    ...options.filter((o) => !linked.has(o.id)),
  ];
}

"use server";

import { requireApproved } from "@/lib/auth/dal";
import type { ContributorRole } from "@/lib/catalog/master/rules";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { splitRoleOf, type SplitRole } from "@/lib/legal/splits/shares";
import type { NetworkRole } from "@/lib/network/types";
import { createClient } from "@/lib/supabase/server";
import { normalizeSearch } from "@/lib/utils/search";

// Who a line of a title's split may name (Sacha, 07/10/2026: picked, never
// retyped): the title's credited creators first (their contact, or the
// credit itself while it is not linked to the Réseau), then the whole
// Réseau. Each option says what a line keeps of it. Read with the user's
// session.

export type SplitPersonOption = {
  // "contact:<id>" or "credit:<id>".
  id: string;
  label: string;
  detail?: string;
  contactId: string | null;
  creditId: string | null;
  role: SplitRole | null;
};

export async function listSplitPeople(
  masterId: string,
): Promise<SplitPersonOption[]> {
  await requireApproved();
  const id = catalogIdSchema.safeParse(masterId);
  if (!id.success) return [];
  const supabase = await createClient();
  const [credits, contacts] = await Promise.all([
    supabase
      .from("master_contributors")
      .select("id, name, role, contact_id")
      .eq("master_id", id.data)
      .order("created_at"),
    supabase
      .from("network_contacts")
      .select("id, name, roles")
      .is("archived_at", null)
      .order("name")
      .limit(1000),
  ]);
  const t = fr.legalSplits.editor;
  const roles = fr.masterPage.credits.roles as Record<string, string>;
  const credited = new Map<string, SplitPersonOption>();
  const seenNames = new Set<string>();
  for (const c of credits.data ?? []) {
    const role = splitRoleOf(c.role as ContributorRole);
    if (!role) continue;
    const label = roles[c.role] ?? c.role;
    const key = c.contact_id ? `contact:${c.contact_id}` : `credit:${c.id}`;
    const known = credited.get(key);
    if (known) {
      known.detail = `${known.detail}, ${label}`;
      continue;
    }
    // A credit not linked to the Réseau, once by name.
    if (!c.contact_id) {
      const name = normalizeSearch(c.name);
      if (seenNames.has(name)) continue;
      seenNames.add(name);
    }
    credited.set(key, {
      id: key,
      label: c.name,
      detail: c.contact_id
        ? `${fr.masterPage.splits.party.credited} · ${label}`
        : `${fr.masterPage.splits.party.credited} · ${label} · ${t.notInNetwork}`,
      contactId: c.contact_id,
      creditId: c.id,
      role,
    });
  }
  return [
    ...credited.values(),
    ...(contacts.data ?? [])
      .filter((c) => !credited.has(`contact:${c.id}`))
      .map((c) => ({
        id: `contact:${c.id}`,
        label: c.name,
        detail: (c.roles as NetworkRole[])
          .map((r) => fr.network.roles[r])
          .join(", "),
        contactId: c.id,
        creditId: null,
        role: null,
      })),
  ];
}

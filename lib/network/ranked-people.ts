import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fr } from "@/lib/i18n/fr";
import type { NetworkRole } from "@/lib/network/types";
import type { Database } from "@/lib/supabase/database.types";

export type RankedPerson = {
  // The contact's id: what a form stores (contact_id).
  id: string;
  label: string;
  detail?: string;
  // "first": already linked to the object (credited…); "role": holds the
  // role asked for; "network": the rest of the Réseau.
  group: "first" | "role" | "network";
};

/**
 * The Réseau to pick someone from (Sacha, 07/10/2026: pick, never retype):
 * the contacts already linked to the object first (`first`, with why they
 * are, in that order), then those holding `role` (or one of several), then
 * everyone else.
 * Archived contacts are left out. Read with the user's session.
 */
export async function rankedNetwork(
  supabase: SupabaseClient<Database>,
  role: NetworkRole | readonly NetworkRole[],
  first: Map<string, string> = new Map(),
): Promise<RankedPerson[]> {
  const { data, error } = await supabase
    .from("network_contacts")
    .select("id, name, roles, kind")
    .is("archived_at", null)
    .order("name")
    .limit(1000);
  if (error) console.error("rankedNetwork:", error.message);
  const contacts = (data ?? []).map((c) => ({
    id: c.id,
    label: c.name,
    roles: c.roles as NetworkRole[],
    organization: c.kind === "organization",
  }));
  const byId = new Map(contacts.map((c) => [c.id, c]));
  // A structure says so (retour Catalogue 30): never taken for a person.
  const detailOf = (c: { roles: NetworkRole[]; organization: boolean }) =>
    [
      c.organization ? fr.network.picker.structure : null,
      c.roles.map((r) => fr.network.roles[r]).join(", "),
    ]
      .filter(Boolean)
      .join(" · ");

  const linked = [...first].flatMap(([id, detail]) => {
    const contact = byId.get(id);
    return contact
      ? [{ id, label: contact.label, detail, group: "first" as const }]
      : [];
  });
  // "other" says nothing of the person: no group of its own.
  const wanted: readonly NetworkRole[] = (
    typeof role === "string" ? [role] : role
  ).filter((r) => r !== "other");
  const holds = (roles: NetworkRole[]) => roles.some((r) => wanted.includes(r));
  const rest = contacts.filter((c) => !first.has(c.id));
  return [
    ...linked,
    ...rest
      .filter((c) => holds(c.roles))
      .map((c) => ({
        id: c.id,
        label: c.label,
        detail: detailOf(c),
        group: "role" as const,
      })),
    ...rest
      .filter((c) => !holds(c.roles))
      .map((c) => ({
        id: c.id,
        label: c.label,
        detail: detailOf(c) || undefined,
        group: "network" as const,
      })),
  ];
}

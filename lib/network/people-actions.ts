"use server";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import type { NetworkRole } from "@/lib/network/types";
import { createClient } from "@/lib/supabase/server";
import { withPrivateDetails } from "@/lib/network/private-details";

export type NetworkPersonOption = {
  id: string;
  label: string;
  detail?: string;
  // Their roles in the Réseau: a credit takes its roles from them.
  roles: NetworkRole[];
  // How to reach them: an artist's contact copies them.
  email: string | null;
  phone: string | null;
};

/** The Réseau's contacts to pick a person from (a credit of a title, the
 * manager of an artist): name, their roles under it, how to reach them. Archived contacts are left out. Read with the
 * user's session (the Réseau is read by every member). */
export async function listNetworkPeople(): Promise<NetworkPersonOption[]> {
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_contacts")
    .select("id, name, roles, email, phone, private_owner_person_id")
    .is("archived_at", null)
    .order("name")
    .limit(1000);
  if (error) console.error("listNetworkPeople:", error.message);
  // A private contact's coordinates prefill only for whoever may read them.
  const { rows } = await withPrivateDetails(supabase, data ?? []);
  return rows.map((c) => ({
    id: c.id,
    label: c.name,
    detail: (c.roles as NetworkRole[])
      .map((r) => fr.network.roles[r])
      .join(", "),
    roles: c.roles as NetworkRole[],
    email: c.email,
    phone: c.phone,
  }));
}

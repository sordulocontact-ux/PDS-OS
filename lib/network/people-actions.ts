"use server";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import type { NetworkRole } from "@/lib/network/types";
import { createClient } from "@/lib/supabase/server";

export type NetworkPersonOption = {
  id: string;
  label: string;
  detail?: string;
};

/** The Réseau's contacts to pick a person from (a credit of a title): name,
 * and their roles under it. Archived contacts are left out. Read with the
 * user's session (the Réseau is read by every member). */
export async function listNetworkPeople(): Promise<NetworkPersonOption[]> {
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_contacts")
    .select("id, name, roles")
    .is("archived_at", null)
    .order("name")
    .limit(1000);
  if (error) console.error("listNetworkPeople:", error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    label: c.name,
    detail: (c.roles as NetworkRole[])
      .map((r) => fr.network.roles[r])
      .join(", "),
  }));
}

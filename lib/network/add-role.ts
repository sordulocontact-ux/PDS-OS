import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { NetworkRole } from "@/lib/network/types";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Gives a contact of the Réseau a role it lacks (a musician chosen as the
 * Brief's engineer becomes an engineer), with the user's session: RLS
 * (manage_network, not archived) decides. A failure is logged only: the
 * choice that asked for it stays saved.
 */
export async function addContactRole(
  supabase: SupabaseClient<Database>,
  contactId: string,
  role: NetworkRole,
): Promise<void> {
  const { data, error } = await supabase
    .from("network_contacts")
    .select("roles")
    .eq("id", contactId)
    .maybeSingle();
  if (error) console.error("addContactRole read:", error.message);
  const roles = (data?.roles ?? null) as NetworkRole[] | null;
  if (!roles || roles.includes(role)) return;
  const { error: update } = await supabase
    .from("network_contacts")
    .update({ roles: [...roles, role] })
    .eq("id", contactId);
  if (update) console.error("addContactRole:", update.message);
}

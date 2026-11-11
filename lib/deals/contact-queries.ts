import "server-only";

import { withPrivateDetails } from "@/lib/network/private-details";
import { networkRolesOf, rolesText } from "@/lib/network/types";
import { createClient } from "@/lib/supabase/server";

/** A person of the deal (BIZ 8): its identity always, its coordinates when
 * the reader may read them (a private contact shared with the deal is). */
export type DealContact = {
  id: string;
  name: string;
  roles: string;
  email: string | null;
  phone: string | null;
  isPrivate: boolean;
  // Private and not readable by the reader.
  hidden: boolean;
};

export async function loadDealContacts(dealId: string): Promise<DealContact[]> {
  const supabase = await createClient();
  const { data: links, error } = await supabase
    .from("deal_contacts")
    .select("contact_id")
    .eq("deal_id", dealId)
    .order("created_at");
  if (error) console.error("loadDealContacts:", error.message);
  const ids = (links ?? []).map((l) => l.contact_id);
  if (ids.length === 0) return [];
  const { data: contacts } = await supabase
    .from("network_contacts")
    .select("id, name, roles, email, phone, private_owner_person_id")
    .in("id", ids);
  const { rows, hidden } = await withPrivateDetails(supabase, contacts ?? []);
  const byId = new Map(rows.map((c) => [c.id, c]));
  return ids.flatMap((id): DealContact[] => {
    const c = byId.get(id);
    return c
      ? [
          {
            id: c.id,
            name: c.name,
            roles: rolesText(networkRolesOf(c.roles)),
            email: c.email,
            phone: c.phone,
            isPrivate: Boolean(c.private_owner_person_id),
            hidden: hidden.has(c.id),
          },
        ]
      : [];
  });
}

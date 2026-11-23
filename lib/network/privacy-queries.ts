import "server-only";

import { dealName } from "@/lib/deals/names";
import { loadDeals } from "@/lib/deals/queries";
import type { Access } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

// A private contact's sharing (BIZ 8), read with the user's session: the
// deals it is linked to that the reader sees (RLS).

export async function loadContactPrivacy(
  access: Access,
  contactId: string,
): Promise<{ deals: { id: string; name: string }[] }> {
  const supabase = await createClient();
  const [{ data: links }, { deals }] = await Promise.all([
    supabase
      .from("deal_contacts")
      .select("deal_id")
      .eq("contact_id", contactId),
    loadDeals(access),
  ]);
  const linked = new Set((links ?? []).map((l) => l.deal_id));
  return {
    deals: deals
      .filter((d) => linked.has(d.id))
      .map((d) => ({ id: d.id, name: dealName(d) })),
  };
}

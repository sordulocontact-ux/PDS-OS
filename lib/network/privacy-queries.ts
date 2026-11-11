import "server-only";

import { dealName } from "@/lib/deals/names";
import { loadDeals } from "@/lib/deals/queries";
import type { Access } from "@/lib/auth/access";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// A private contact's sharing (BIZ 8), read with the user's session: the
// deals it is linked to that the reader sees, and the journal for its owner
// and the direction (RLS).

export type ContactPrivacyEvent = {
  id: string;
  kind: string;
  dealName: string | null;
  actor: string | null;
  at: string;
};

export async function loadContactPrivacy(
  access: Access,
  contactId: string,
): Promise<{
  deals: { id: string; name: string }[];
  events: ContactPrivacyEvent[];
}> {
  const supabase = await createClient();
  const [{ data: links }, { data: events }, { deals }] = await Promise.all([
    supabase
      .from("deal_contacts")
      .select("deal_id")
      .eq("contact_id", contactId),
    supabase
      .from("network_contact_privacy_events")
      .select(
        "id, kind, deal_id, created_at, actor:people!network_contact_privacy_events_actor_person_id_fkey(first_name, last_name)",
      )
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false })
      .limit(50),
    loadDeals(access),
  ]);
  const names = new Map(deals.map((d) => [d.id, dealName(d)]));
  const linked = new Set((links ?? []).map((l) => l.deal_id));
  return {
    deals: deals
      .filter((d) => linked.has(d.id))
      .map((d) => ({ id: d.id, name: dealName(d) })),
    events: (events ?? []).map((e) => ({
      id: e.id,
      kind: e.kind,
      dealName: e.deal_id ? (names.get(e.deal_id) ?? null) : null,
      actor: e.actor ? personName(e.actor.first_name, e.actor.last_name) : null,
      at: e.created_at,
    })),
  };
}

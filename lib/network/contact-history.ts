import "server-only";

import { CONTRIBUTOR_ROLES, oneOf } from "@/lib/catalog/master/rules";
import { createClient } from "@/lib/supabase/server";

// Réseau (proto des pages, 29/10/2026): what a contact already did with PDS,
// known elsewhere in the app: their credits on the catalog's titles, and the
// calls they were invited to. RLS leaves out what the viewer may not read.

export type ContactCredit = {
  masterId: string;
  title: string;
  role: (typeof CONTRIBUTOR_ROLES)[number];
};

export type ContactCall = { id: string; title: string; occurredAt: string };

const LIMIT = 50;

export async function loadContactHistory(contactId: string): Promise<{
  credits: ContactCredit[];
  calls: ContactCall[];
}> {
  const supabase = await createClient();
  const [credits, calls] = await Promise.all([
    supabase
      .from("master_contributors")
      .select(
        "role, master:masters!master_contributors_master_same_org(id, title, archived_at)",
      )
      .eq("contact_id", contactId)
      .limit(LIMIT),
    supabase
      .from("call_guests")
      .select("call:calls!call_guests_call_same_org(id, title, occurred_at)")
      .eq("contact_id", contactId)
      .limit(LIMIT),
  ]);
  if (credits.error)
    console.error("loadContactHistory credits:", credits.error.message);
  if (calls.error)
    console.error("loadContactHistory calls:", calls.error.message);
  return {
    credits: (credits.data ?? [])
      .flatMap((row) =>
        row.master && row.master.archived_at === null
          ? [
              {
                masterId: row.master.id,
                title: row.master.title,
                role: oneOf(CONTRIBUTOR_ROLES, row.role, "other"),
              },
            ]
          : [],
      )
      .sort((a, b) => a.title.localeCompare(b.title, "fr")),
    // Latest first.
    calls: (calls.data ?? [])
      .flatMap((row) =>
        row.call
          ? [
              {
                id: row.call.id,
                title: row.call.title,
                occurredAt: row.call.occurred_at,
              },
            ]
          : [],
      )
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
  };
}

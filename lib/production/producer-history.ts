import "server-only";

import { createClient } from "@/lib/supabase/server";

/** A previous answer to « Qui produit ? », stopped with its reason. */
export type ProducerChange = {
  id: string;
  kind: "internal" | "external";
  company: string | null;
  stoppedAt: string;
  stoppedBy: string | null;
  reason: string;
  done: string[];
  carried: string[];
  linkRevoked: boolean;
};

/** The previous choices of who produces a sheet, newest first; names
 * from the sheet's members and Réseau contacts. */
export async function loadProducerChanges(
  sheetId: string,
  names: {
    person: (id: string | null) => string | null;
    contact: (id: string | null) => string | null;
  },
): Promise<ProducerChange[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_organization_changes")
    .select(
      "id, from_kind, from_company_contact_id, reason, done, carried, link_revoked, changed_at, changed_by",
    )
    .eq("sheet_id", sheetId)
    .order("changed_at", { ascending: false });
  if (error) console.error("loadProducerChanges:", error.message);
  return (data ?? []).map((c) => {
    return {
      id: c.id,
      kind: c.from_kind === "external" ? "external" : "internal",
      company: names.contact(c.from_company_contact_id),
      stoppedAt: c.changed_at,
      stoppedBy: names.person(c.changed_by),
      reason: c.reason,
      done: c.done,
      carried: c.carried,
      linkRevoked: c.link_revoked,
    };
  });
}

/** The latest link of each contact of a sheet that is no longer active
 * (revoked, or replaced and not renewed): when, for « Révoqué le … ». */
export async function loadRevokedLinks(
  sheetId: string,
): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("production_provider_links")
    .select("contact_id, revoked_at, created_at")
    .eq("sheet_id", sheetId)
    .order("created_at", { ascending: false });
  const seen = new Set<string>();
  const revoked: Record<string, string> = {};
  for (const l of data ?? []) {
    if (seen.has(l.contact_id)) continue;
    seen.add(l.contact_id);
    if (l.revoked_at) revoked[l.contact_id] = l.revoked_at;
  }
  return revoked;
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

// Private contacts (BIZ 8, docs/ARCHITECTURE.md § 8 quaterdecies): a private
// contact's coordinates are not in network_contacts but in
// network_contact_private_details, whose RLS gives them to its owner, the
// direction and the readers of a deal it is shared with. Every path of the
// app that needs a contact's address merges them here, with the user's
// session: it works for whoever has the right, finds nothing otherwise.

type Client = SupabaseClient<Database>;

export type ContactCoordinates = {
  email: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
};

/** The private coordinates the reader may read, by contact. */
export async function privateDetailsOf(
  supabase: Client,
  contactIds: string[],
): Promise<Map<string, ContactCoordinates>> {
  const ids = [...new Set(contactIds)];
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("network_contact_private_details")
    .select("contact_id, email, phone, city, notes")
    .in("contact_id", ids);
  if (error) console.error("privateDetailsOf:", error.message);
  return new Map(
    (data ?? []).map((d) => [
      d.contact_id,
      { email: d.email, phone: d.phone, city: d.city, notes: d.notes },
    ]),
  );
}

type Row = {
  id: string;
  private_owner_person_id?: string | null;
} & Partial<ContactCoordinates>;

/**
 * The rows with the coordinates the reader may read: a private contact's
 * come from its private details, or stay empty. `hidden` lists the private
 * contacts whose coordinates the reader may not read (« coordonnées
 * privées », never « pas d'adresse »).
 */
export async function withPrivateDetails<T extends Row>(
  supabase: Client,
  rows: T[],
): Promise<{ rows: T[]; hidden: Set<string> }> {
  const privateIds = rows
    .filter((r) => r.private_owner_person_id)
    .map((r) => r.id);
  const details = await privateDetailsOf(supabase, privateIds);
  const hidden = new Set(privateIds.filter((id) => !details.has(id)));
  return {
    rows: rows.map((row) => {
      const d = details.get(row.id);
      if (!row.private_owner_person_id || !d) return row;
      const merged = { ...row };
      for (const key of ["email", "phone", "city", "notes"] as const)
        if (key in row) merged[key] = d[key] as T[typeof key];
      return merged;
    }),
    hidden,
  };
}

/** A contact's name and address for an e-mail PDS OS sends: a private
 * contact's only for whoever may read it, else no address (the sender then
 * says it cannot send, as for a contact without one). */
export async function contactAddressOf(
  supabase: Client,
  contactId: string,
): Promise<{ name: string; email: string | null } | null> {
  const { data } = await supabase
    .from("network_contacts")
    .select("id, name, email, private_owner_person_id")
    .eq("id", contactId)
    .maybeSingle();
  if (!data) return null;
  const { rows } = await withPrivateDetails(supabase, [data]);
  return { name: data.name, email: rows[0]?.email ?? null };
}

import "server-only";

import { can, type Access } from "@/lib/auth/access";
import type { createClient } from "@/lib/supabase/server";
import { normalizeSearch } from "@/lib/utils/search";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * A contact just added to the Réseau takes the credits of its exact name
 * that no contact holds yet (Sacha, 05/10/2026: « si on rajoute au réseau,
 * c'est logique que ça soit le même »). Only at creation: a credit already
 * linked is never moved, and a namesake of an existing contact still only
 * proposes « Relier ». Written with the user's session (RLS: manage_catalog
 * on a live title); without that right, nothing is linked.
 */
export async function linkCreditsOfNewContact(
  supabase: Supabase,
  access: Access,
  contact: { id: string; name: string },
): Promise<number> {
  if (!can(access, "manage_catalog") || !access.organizationId) return 0;
  const pattern = contact.name.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: credits, error } = await supabase
    .from("master_contributors")
    .select("id, name")
    .eq("organization_id", access.organizationId)
    .is("contact_id", null)
    .ilike("name", pattern);
  if (error) {
    console.error("linkCreditsOfNewContact:", error.message);
    return 0;
  }
  const key = normalizeSearch(contact.name);
  const ids = (credits ?? [])
    .filter((c) => normalizeSearch(c.name) === key)
    .map((c) => c.id);
  if (ids.length === 0) return 0;
  const { data: linked, error: linkError } = await supabase
    .from("master_contributors")
    .update({ contact_id: contact.id })
    .in("id", ids)
    .is("contact_id", null)
    .select("id");
  if (linkError)
    console.error("linkCreditsOfNewContact link:", linkError.message);
  return linked?.length ?? 0;
}

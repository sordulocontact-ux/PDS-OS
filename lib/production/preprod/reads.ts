import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

// Small reads shared by the Préproduction tab and the processing of a
// production call.

/** The topics of a call's agenda (calls.agenda), in order. */
export function agendaTopics(agenda: Json | null): string[] {
  if (!Array.isArray(agenda)) return [];
  return agenda.flatMap((item) =>
    item &&
    typeof item === "object" &&
    !Array.isArray(item) &&
    typeof item.topic === "string" &&
    item.topic.trim()
      ? [item.topic.trim()]
      : [],
  );
}

/** Phone and e-mail of Réseau contacts (the call sheet's contacts), read
 * from the Réseau, never copied. */
export async function loadContactDetails(
  contactIds: string[],
): Promise<Record<string, { phone: string | null; email: string | null }>> {
  if (contactIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_contacts")
    .select("id, phone, email")
    .in("id", [...new Set(contactIds)]);
  if (error) console.error("loadContactDetails:", error.message);
  return Object.fromEntries(
    (data ?? []).map((c) => [c.id, { phone: c.phone, email: c.email }]),
  );
}

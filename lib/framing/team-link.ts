import "server-only";

import { matchByName } from "@/lib/assistant/fuzzy-name";
import { personName } from "@/lib/projects/types";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Team rows read in a call or the initial context name people as they were
 * said (« Yannis »): each one that clearly designates a member of the team
 * (accents, a doubled or missing letter, a first name only: the same code
 * matcher as PO's drafts, lib/assistant/fuzzy-name.ts) is linked to that
 * member, under the member's own name (UX test of 09/10/2026: « Yannis »
 * never linked to Yanis Roche). Unclear or unknown names stay as said.
 */
export async function linkTeamToMembers<T extends { display_name: string }>(
  supabase: Client,
  rows: T[],
): Promise<Array<T & { person_id?: string }>> {
  if (rows.length === 0) return rows;
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "person_id, people!memberships_person_id_fkey(first_name, last_name)",
    )
    .eq("status", "approved");
  if (error) {
    console.error("linkTeamToMembers:", error.message);
    return rows;
  }
  const members = (data ?? []).flatMap((m) =>
    m.people
      ? [
          {
            personId: m.person_id,
            name: personName(m.people.first_name, m.people.last_name),
          },
        ]
      : [],
  );
  return rows.map((row) => {
    const member = matchByName(members, row.display_name, (m) => m.name);
    return member
      ? { ...row, person_id: member.personId, display_name: member.name }
      : row;
  });
}

import "server-only";

import { isOrganizationRole } from "@/lib/auth/redirects";
import { isMembershipStatus, type MembershipRow } from "@/lib/members/types";
import { createClient } from "@/lib/supabase/server";

// Memberships of an organization, with each Person. RLS only returns what
// the admin may see: the query has nothing more to filter.
export async function listMemberships(
  organizationId: string,
): Promise<{ rows: MembershipRow[]; error: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select(
      "id, role, status, requested_at, decided_at, decision_note, person:people!memberships_person_id_fkey(id, first_name, last_name, email)",
    )
    .eq("organization_id", organizationId)
    .order("requested_at", { ascending: false });

  if (error) {
    console.error("listMemberships:", error.message);
    return { rows: [], error: true };
  }

  const rows: MembershipRow[] = [];
  for (const raw of data ?? []) {
    if (
      !raw.person ||
      !isMembershipStatus(raw.status) ||
      (raw.role !== null && !isOrganizationRole(raw.role))
    )
      continue;
    rows.push({
      id: raw.id,
      role: raw.role,
      status: raw.status,
      requestedAt: raw.requested_at,
      decidedAt: raw.decided_at,
      decisionNote: raw.decision_note,
      person: {
        id: raw.person.id,
        firstName: raw.person.first_name ?? "",
        lastName: raw.person.last_name,
        email: raw.person.email,
      },
    });
  }

  return { rows, error: false };
}

// Number of access requests waiting for a decision (admins only; RLS
// returns nothing to others).
export async function countPendingMemberships(
  organizationId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

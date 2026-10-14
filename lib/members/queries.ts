import "server-only";

import { isOrganizationRole } from "@/lib/auth/redirects";
import { isMembershipStatus, type MembershipRow } from "@/lib/members/types";
import { createClient } from "@/lib/supabase/server";

// Memberships of an organization, with each Person and their requests to PO
// today. RLS only returns what the admin may see: the query has nothing more
// to filter.
export async function listMemberships(
  organizationId: string,
): Promise<{ rows: MembershipRow[]; error: boolean }> {
  const supabase = await createClient();
  const [{ data, error }, usage] = await Promise.all([
    supabase
      .from("memberships")
      .select(
        "id, role, status, requested_at, decided_at, decision_note, ai_daily_limit, person:people!memberships_person_id_fkey(id, first_name, last_name, email)",
      )
      .eq("organization_id", organizationId)
      .order("requested_at", { ascending: false }),
    supabase.rpc("ai_usage_today", { p_organization_id: organizationId }),
  ]);

  if (error) {
    console.error("listMemberships:", error.message);
    return { rows: [], error: true };
  }
  // Unread usage shows 0: the limit still comes from the membership.
  if (usage.error) console.error("ai_usage_today:", usage.error.message);
  const usedBy = new Map(
    (usage.data ?? []).map((line) => [line.person_id, line.used]),
  );

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
      ai: { used: usedBy.get(raw.person.id) ?? 0, limit: raw.ai_daily_limit },
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

// The signed-in member's requests to PO today (settings page). The director
// reads every member's line: theirs is picked by person.
export async function getOwnAiUsage(
  organizationId: string,
  personId: string,
): Promise<{ used: number; limit: number } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ai_usage_today", {
    p_organization_id: organizationId,
  });
  if (error) {
    console.error("getOwnAiUsage:", error.message);
    return null;
  }
  const own = data?.find((line) => line.person_id === personId);
  return own ? { used: own.used, limit: own.daily_limit } : null;
}

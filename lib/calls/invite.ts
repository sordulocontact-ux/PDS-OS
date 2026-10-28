import "server-only";

import { networkRolesOf, rolesText } from "@/lib/network/types";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Where a member stands for the project: its owner, its creative team, the
// direction, or a creative director who joins it by the invitation.
export type MemberPlace = "owner" | "team" | "direction" | "creative";
export type TeamPerson = { personId: string; name: string; place: MemberPlace };

const PLACES: readonly string[] = ["owner", "team", "direction", "creative"];

/**
 * Who a project call may invite in the app (list_project_call_people, the
 * rule of call_attendees_check): the owner, the creative team, the
 * direction, then the creative directors not yet on the project, who join
 * its creative team when invited (Sacha 28/10/2026).
 */
export async function loadCallMembers(
  projectId: string,
): Promise<TeamPerson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_project_call_people", {
    p_project_id: projectId,
  });
  if (error) console.error("[calls] load members failed:", error.message);
  return (data ?? [])
    .filter((p) => PLACES.includes(p.place))
    .map((p) => ({
      personId: p.person_id,
      name: personName(p.first_name, p.last_name),
      place: p.place as MemberPlace,
    }));
}

/**
 * Invites members of the project's team to one of its calls; each one is
 * notified by a database trigger (call_invited), then the push leaves. Either
 * by id (« Nouveau call ») or by the names code proposed from this same team
 * in a prepared exchange (a name kept = invited, a chip removed = not).
 * Never the person who creates the call.
 */
export async function inviteProjectTeam(input: {
  callId: string;
  organizationId: string;
  projectId: string;
  mePersonId: string | null;
  personIds?: string[];
  names?: string[];
}): Promise<void> {
  const team = await loadCallMembers(input.projectId);
  const ids = new Set(input.personIds ?? []);
  const names = new Set(input.names ?? []);
  const invited = team.filter(
    (p) =>
      p.personId !== input.mePersonId &&
      (ids.has(p.personId) || names.has(p.name)),
  );
  if (invited.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("call_attendees").insert(
    invited.map((p) => ({
      call_id: input.callId,
      organization_id: input.organizationId,
      person_id: p.personId,
    })),
  );
  if (error) console.error("[calls] invite team failed:", error.message);
  else await schedulePendingPushes();
}

export type CallContact = {
  contactId: string;
  name: string;
  // Null: the contact cannot be invited until the Réseau has an address.
  email: string | null;
  roles: string;
};

/** The Réseau contacts a call may invite by e-mail (archived ones left out). */
export async function loadCallContacts(): Promise<CallContact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_contacts")
    .select("id, name, email, roles")
    .is("archived_at", null)
    .order("name")
    .limit(1000);
  if (error) console.error("[calls] load contacts failed:", error.message);
  return (data ?? []).map((c) => ({
    contactId: c.id,
    name: c.name,
    email: c.email,
    roles: rolesText(networkRolesOf(c.roles)),
  }));
}

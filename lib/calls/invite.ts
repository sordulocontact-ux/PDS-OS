import "server-only";

import { networkRolesOf, rolesText } from "@/lib/network/types";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { listProjectCreatives } from "@/lib/projects/creatives";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

export type TeamPerson = { personId: string; name: string };

/** Who can be invited to a project call: its owner and creative directors. */
export async function loadProjectTeam(
  projectId: string,
): Promise<TeamPerson[]> {
  const supabase = await createClient();
  const [{ data: project }, creatives] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "owner_person_id, owner:people!projects_owner_person_id_fkey(first_name, last_name)",
      )
      .eq("id", projectId)
      .maybeSingle(),
    listProjectCreatives(projectId),
  ]);
  const team: TeamPerson[] = [];
  if (project?.owner_person_id && project.owner)
    team.push({
      personId: project.owner_person_id,
      name: personName(project.owner.first_name, project.owner.last_name),
    });
  for (const c of creatives)
    if (!team.some((p) => p.personId === c.personId)) team.push(c);
  return team;
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
  const team = await loadProjectTeam(input.projectId);
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

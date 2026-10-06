"use server";

import { z } from "zod";

import { done, id, orgId, text } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { TEAM_ROLE_KEYS } from "@/lib/framing/team-roles";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

const who = z.union([
  z.object({ memberId: id }),
  z.object({ contactId: id }),
  z.object({ name: text(120) }),
]);

/**
 * Gives a fixed role to a person already in the team or to a new name. A role
 * is held by at most one row (unique index): the previous holder, if any,
 * stays in the team without the role. Assigned by a person, so confirmed.
 */
export async function assignRole(
  projectId: string,
  roleKey: string,
  person: z.input<typeof who>,
): Promise<ActionResult> {
  const p = z
    .object({ projectId: id, roleKey: z.enum(TEAM_ROLE_KEYS), person: who })
    .safeParse({ projectId, roleKey, person });
  const organizationId = await orgId();
  if (!p.success || !organizationId) return fail("invalid_input");
  const supabase = await createClient();
  const role = fr.framingGuide.team.roles[p.data.roleKey];

  const { data: holder } = await supabase
    .from("project_team_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("role_key", p.data.roleKey)
    .neq("review_status", "rejected")
    .maybeSingle();

  // An engineer of the Réseau: the name is read from the contact, never
  // taken from the client (docs/ARCHITECTURE.md § 8 septies).
  let contactId: string | null = null;
  if ("contactId" in p.data.person) {
    const { data: contact } = await supabase
      .from("network_contacts")
      .select("id, name")
      .eq("id", p.data.person.contactId)
      .is("archived_at", null)
      .maybeSingle();
    if (!contact) return fail("not_found");
    contactId = contact.id;
    p.data.person = { name: contact.name };
  }

  if ("name" in p.data.person) {
    const { error } = holder
      ? await supabase
          .from("project_team_members")
          .update({
            display_name: p.data.person.name,
            person_id: null,
            contact_id: contactId,
            review_status: "confirmed",
          })
          .eq("id", holder.id)
      : await supabase.from("project_team_members").insert({
          organization_id: organizationId,
          project_id: projectId,
          display_name: p.data.person.name,
          role,
          role_key: p.data.roleKey,
          contact_id: contactId,
        });
    return done(projectId, error);
  }

  const memberId = p.data.person.memberId;
  if (holder && holder.id !== memberId) {
    const { error } = await supabase
      .from("project_team_members")
      .update({ role_key: null })
      .eq("id", holder.id);
    if (error) return done(projectId, error);
  }
  const { error } = await supabase
    .from("project_team_members")
    .update({ role_key: p.data.roleKey, role, review_status: "confirmed" })
    .eq("id", memberId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

/** The person stays in the team; the role goes back to "à trouver". */
export async function releaseRole(
  projectId: string,
  memberId: string,
): Promise<ActionResult> {
  if (!id.safeParse(projectId).success || !id.safeParse(memberId).success)
    return fail("invalid_input");
  if (!(await orgId())) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_team_members")
    .update({ role_key: null })
    .eq("id", memberId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

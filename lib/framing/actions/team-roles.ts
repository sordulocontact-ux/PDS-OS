"use server";

import { z } from "zod";

import { done, id, orgId, text } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { TEAM_ROLE_KEYS } from "@/lib/framing/team-roles";
import { fr } from "@/lib/i18n/fr";
import {
  listCreativePeople,
  type CreativeMember,
} from "@/lib/projects/creatives";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

const who = z.union([
  z.object({ memberId: id }),
  // A member of the app (a creative director), by their person.
  z.object({ personId: id }),
  z.object({ contactId: id }),
  z.object({ name: text(120) }),
]);

/** The creative directors of the organization, offered for the artistic
 * and creative direction (Sacha, 10/10/2026). Read with the user's session. */
export async function listCreativeCandidates(): Promise<CreativeMember[]> {
  const organizationId = await orgId();
  return organizationId ? listCreativePeople(organizationId) : [];
}

/**
 * Gives a fixed role to a person already in the team, a member of the app,
 * a contact of the Réseau or a new name. A role is held by at most one row
 * (unique index); a person may hold several roles, one row each (Sacha,
 * 10/10/2026): a row free of any role is reused, never one holding another
 * role. Assigned by a person, so confirmed.
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
  const who_ = p.data.person;

  const rows = () =>
    supabase
      .from("project_team_members")
      .select("id, display_name, person_id, contact_id, role_key")
      .eq("project_id", projectId)
      .neq("review_status", "rejected");
  const { data: holder } = await rows()
    .eq("role_key", p.data.roleKey)
    .maybeSingle();

  // Who gets the role: names read from their source, never the client
  // (docs/ARCHITECTURE.md § 8 septies), and their row free of any role.
  let identity: {
    name: string;
    personId: string | null;
    contactId: string | null;
  };
  let free: { id: string } | null = null;
  if ("memberId" in who_) {
    const { data: row } = await rows().eq("id", who_.memberId).maybeSingle();
    if (!row) return fail("not_found");
    identity = {
      name: row.display_name,
      personId: row.person_id,
      contactId: row.contact_id,
    };
    if (!row.role_key || row.role_key === p.data.roleKey) free = row;
  } else if ("personId" in who_) {
    const { data: person } = await supabase
      .from("people")
      .select("id, first_name, last_name")
      .eq("id", who_.personId)
      .maybeSingle();
    if (!person) return fail("not_found");
    identity = {
      name: personName(person.first_name, person.last_name),
      personId: person.id,
      contactId: null,
    };
    const { data: row } = await rows()
      .eq("person_id", person.id)
      .is("role_key", null)
      .limit(1)
      .maybeSingle();
    free = row;
  } else if ("contactId" in who_) {
    const { data: contact } = await supabase
      .from("network_contacts")
      .select("id, name")
      .eq("id", who_.contactId)
      .is("archived_at", null)
      .maybeSingle();
    if (!contact) return fail("not_found");
    identity = { name: contact.name, personId: null, contactId: contact.id };
    const { data: row } = await rows()
      .eq("contact_id", contact.id)
      .is("role_key", null)
      .limit(1)
      .maybeSingle();
    free = row;
  } else {
    identity = { name: who_.name, personId: null, contactId: null };
  }

  // Their own row: the role moves to it; the previous holder stays in the
  // team without the role.
  if (free) {
    if (holder && holder.id !== free.id) {
      const { error } = await supabase
        .from("project_team_members")
        .update({ role_key: null })
        .eq("id", holder.id);
      if (error) return done(projectId, error);
    }
    const { error } = await supabase
      .from("project_team_members")
      .update({ role_key: p.data.roleKey, role, review_status: "confirmed" })
      .eq("id", free.id)
      .eq("project_id", projectId);
    return done(projectId, error);
  }

  // Otherwise a row of its own for this role: the holder's row is taken
  // over, or a new one is added.
  const { error } = holder
    ? await supabase
        .from("project_team_members")
        .update({
          display_name: identity.name,
          person_id: identity.personId,
          contact_id: identity.contactId,
          review_status: "confirmed",
        })
        .eq("id", holder.id)
    : await supabase.from("project_team_members").insert({
        organization_id: organizationId,
        project_id: projectId,
        display_name: identity.name,
        role,
        role_key: p.data.roleKey,
        person_id: identity.personId,
        contact_id: identity.contactId,
      });
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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { FORM_ROLES } from "@/lib/legal/forms/definition";
import { suggestedFormRole } from "@/lib/legal/project-contacts/roles";
import { fr } from "@/lib/i18n/fr";
import type { NetworkRole } from "@/lib/network/types";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

export type LegalContactOption = {
  id: string;
  label: string;
  detail?: string;
  // The role its Réseau roles suggest, pre-filled (lib/legal/project-contacts/roles.ts).
  role: string;
};

/**
 * Who may be added to the project's legal file: the Réseau, minus the
 * people credited on its titles (known by their credit) and those already
 * added. Read with the user's session (RLS: manage_legal).
 */
export async function listLegalContactOptions(
  projectId: string,
): Promise<LegalContactOption[]> {
  const access = await requireApproved();
  const id = z.uuid().safeParse(projectId);
  if (!id.success || !can(access, "manage_legal")) return [];
  const supabase = await createClient();
  const [titles, added, contacts] = await Promise.all([
    supabase
      .from("project_masters")
      .select("master_id")
      .eq("project_id", id.data),
    supabase
      .from("legal_project_contacts")
      .select("contact_id")
      .eq("project_id", id.data),
    supabase
      .from("network_contacts")
      .select("id, name, roles")
      .is("archived_at", null)
      .order("name")
      .limit(1000),
  ]);
  const masterIds = (titles.data ?? []).map((t) => t.master_id);
  const credits = masterIds.length
    ? await supabase
        .from("master_contributors")
        .select("contact_id")
        .in("master_id", masterIds)
        .not("contact_id", "is", null)
    : { data: [] };
  const taken = new Set([
    ...(added.data ?? []).map((row) => row.contact_id),
    ...(credits.data ?? []).flatMap((row) =>
      row.contact_id ? [row.contact_id] : [],
    ),
  ]);
  return (contacts.data ?? [])
    .filter((contact) => !taken.has(contact.id))
    .map((contact) => {
      const roles = contact.roles as NetworkRole[];
      return {
        id: contact.id,
        label: contact.name,
        detail:
          roles.map((role) => fr.network.roles[role]).join(", ") || undefined,
        role: suggestedFormRole(roles),
      };
    });
}

const addSchema = z.object({
  projectId: z.uuid(),
  contactId: z.uuid(),
  role: z.enum(FORM_ROLES),
});

const roleSchema = z.object({
  projectId: z.uuid(),
  rowId: z.uuid(),
  role: z.enum(FORM_ROLES),
});

const ERRORS: Record<string, string> = {
  legal_contact_credited: fr.legal.projectContacts.errors.credited,
  legal_contact_already_added: fr.legal.projectContacts.errors.alreadyAdded,
  legal_contact_in_use: fr.legal.projectContacts.errors.inUse,
};

const errorOf = (message: string) =>
  Object.entries(ERRORS).find(([code]) => message.includes(code))?.[1] ??
  fr.legal.projectContacts.errors.failed;

/** Adds a person of the Réseau to the legal file (add_legal_project_contact). */
export async function addLegalProjectContact(input: {
  projectId: string;
  contactId: string;
  role: string;
}): Promise<Result> {
  await requireApproved();
  const parsed = addSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.legal.projectContacts.errors.failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_legal_project_contact", {
    p_project_id: parsed.data.projectId,
    p_contact_id: parsed.data.contactId,
    p_role: parsed.data.role,
  });
  if (error) {
    console.error("addLegalProjectContact:", error.message);
    return { ok: false, error: errorOf(error.message) };
  }
  revalidatePath(routes.projectLegal(parsed.data.projectId), "layout");
  return { ok: true };
}

/** Takes a person out of the legal file, unless a contract was mapped. */
export async function removeLegalProjectContact(
  projectId: string,
  rowId: string,
): Promise<Result> {
  await requireApproved();
  if (
    !z.uuid().safeParse(projectId).success ||
    !z.uuid().safeParse(rowId).success
  )
    return { ok: false, error: fr.legal.projectContacts.errors.failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_legal_project_contact", {
    p_id: rowId,
  });
  if (error) {
    console.error("removeLegalProjectContact:", error.message);
    return { ok: false, error: errorOf(error.message) };
  }
  revalidatePath(routes.projectLegal(projectId), "layout");
  return { ok: true };
}

/** Changes an intervenant's role on its row (set_legal_project_contact_role),
 * unless a contract was already mapped for that role. */
export async function setLegalProjectContactRole(input: {
  projectId: string;
  rowId: string;
  role: string;
}): Promise<Result> {
  await requireApproved();
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.legal.projectContacts.errors.failed };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_legal_project_contact_role", {
    p_id: parsed.data.rowId,
    p_role: parsed.data.role,
  });
  if (error) {
    console.error("setLegalProjectContactRole:", error.message);
    return {
      ok: false,
      error: error.message.includes("legal_contact_in_use")
        ? fr.legal.projectContacts.errors.roleInUse
        : fr.legal.projectContacts.errors.failed,
    };
  }
  revalidatePath(routes.projectLegal(parsed.data.projectId), "layout");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { LEGAL_FORM_VERSION } from "@/lib/legal/forms/definition";
import {
  formAnswersOf,
  formPeople,
  formRolesOf,
} from "@/lib/legal/forms/people";
import { readInventoryRows } from "@/lib/legal/inventory-rows";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

// The project's side of the fiches (ticket Juridique 02): « Alizé vérifie
// les destinataires et copie les liens », then follows the answers. Every
// write goes through a SQL function that checks manage_legal itself.

export type PrepareResult =
  // `email`: the person's Réseau address, for a ready e-mail; `project`:
  // the project's title, for its subject.
  | { ok: true; url: string; email: string | null; project: string }
  | { ok: false; error: string };

/**
 * Prepares the fiche of one credited person: their contact (created from the
 * credit if nobody of that name is in the Réseau, credits linked; a namesake
 * is linked first with « Relier », never here), a new link (the
 * previous one revoked). The person is found again on the server from the
 * project's credits, never taken from the browser. The link is returned
 * once: only its hash is kept.
 */
export async function prepareLegalForm(
  projectId: string,
  personKey: string,
): Promise<PrepareResult> {
  const t = fr.legalForms.page;
  const id = catalogIdSchema.safeParse(projectId);
  const access = await requireApproved();
  if (!id.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const project = await getProject(id.data);
  if (!project) return { ok: false, error: fr.auth.errors.forbidden };

  const rows = await readInventoryRows(
    project.id,
    project.masters,
    can(access, "manage_catalog"),
  );
  const person = formPeople(rows).find((p) => p.key === personKey);
  if (!person) return { ok: false, error: t.failed };
  if (person.namesakeId) return { ok: false, error: t.namesake };
  if (person.artistId) return { ok: false, error: t.notInNetwork(person.name) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("prepare_legal_form", {
    p_project_id: project.id,
    p_contact_id: person.contactId,
    p_name: person.name,
    p_network_roles: person.networkRoles,
    // Only a contact created now takes the credits (prepare_legal_form).
    p_credit_ids: person.contactId ? [] : person.unlinkedCreditIds,
    p_prefill: {
      roles: formRolesOf(person),
      answers: formAnswersOf(person),
    },
    p_version: LEGAL_FORM_VERSION,
  });
  const token = data?.[0]?.token;
  if (error || !token) {
    if (error) console.error("prepareLegalForm:", error.message);
    return { ok: false, error: t.failed };
  }
  const { data: contact } = person.contactId
    ? await supabase
        .from("network_contacts")
        .select("email")
        .eq("id", person.contactId)
        .maybeSingle()
    : { data: null };
  revalidatePath(routes.projectLegal(project.id), "layout");
  return {
    ok: true,
    url: `${siteUrl()}${routes.legalForm(token)}`,
    email: contact?.email ?? null,
    project: project.title,
  };
}

const formAction = z.object({
  projectId: catalogIdSchema,
  formId: catalogIdSchema,
});

export type FormActionResult = { ok: true } | { ok: false; error: string };

async function run(
  input: z.infer<typeof formAction>,
  call: (
    supabase: Awaited<ReturnType<typeof createClient>>,
    formId: string,
  ) => PromiseLike<{ error: { message: string } | null }>,
): Promise<FormActionResult> {
  const parsed = formAction.safeParse(input);
  const access = await requireApproved();
  if (!parsed.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { error } = await call(supabase, parsed.data.formId);
  if (error) {
    console.error("legal form action:", error.message);
    return { ok: false, error: fr.legalForms.page.failed };
  }
  revalidatePath(routes.projectLegal(parsed.data.projectId), "layout");
  return { ok: true };
}

/** « Marquer comme envoyée » or « Révoquer ». */
export async function setLegalFormState(
  projectId: string,
  formId: string,
  state: "sent" | "revoked",
): Promise<FormActionResult> {
  if (state !== "sent" && state !== "revoked")
    return { ok: false, error: fr.auth.errors.forbidden };
  return run({ projectId, formId }, (supabase, id) =>
    supabase.rpc("set_legal_form_state", { p_form_id: id, p_state: state }),
  );
}

/** The corrections of a submission, accepted or not (« revue avant
 * propagation »). */
export async function reviewLegalForm(
  projectId: string,
  formId: string,
  accept: boolean,
): Promise<FormActionResult> {
  return run({ projectId, formId }, (supabase, id) =>
    supabase.rpc("review_legal_form", {
      p_form_id: id,
      p_accept: accept === true,
    }),
  );
}

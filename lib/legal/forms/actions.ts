"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { sealLinkToken } from "@/lib/legal/forms/link-seal";
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
import { ficheMissing } from "@/lib/legal/forms/completeness";
import { legalOutcome } from "@/lib/legal/outcome";
import type { WriteResult } from "@/lib/utils/write-result";

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
  // Kept sealed so the link stays visible in the démarche (rule 19).
  const sealed = sealLinkToken(token);
  if (sealed) {
    const { error: sealError } = await supabase.rpc("seal_legal_form_link", {
      p_form_id: data[0].form_id,
      p_sealed: sealed,
    });
    if (sealError) console.error("prepareLegalForm seal:", sealError.message);
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
    // The database holds the fiche's completeness too (JUR-06).
    if (error.message.includes("legal_form_incomplete"))
      return { ok: false, error: fr.legalForms.page.incomplete };
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

/** « Révoquer l'accès », with why (proto « Projet complet »): the link
 * stops working at once; what the person sent is kept. */
export async function revokeLegalForm(
  projectId: string,
  formId: string,
  reason: string,
): Promise<FormActionResult> {
  const why = reason.trim().slice(0, 1000);
  if (!why) return { ok: false, error: fr.legalForms.page.revokeWhyMissing };
  return run({ projectId, formId }, (supabase, id) =>
    supabase.rpc("revoke_legal_form", { p_form_id: id, p_reason: why }),
  );
}

/** The latest answers of a fiche, to check what a contract needs (JUR-06). */
async function submissionOf(formId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_form_submissions")
    .select("roles, person")
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("legal form submission:", error.message);
  return data
    ? {
        roles: data.roles,
        person: Object.fromEntries(
          Object.entries((data.person ?? {}) as Record<string, unknown>).map(
            ([k, v]) => [k, String(v ?? "")],
          ),
        ),
      }
    : null;
}

/** « Valider la fiche », its corrections accepted or not (« revue avant
 * propagation »). A fiche that misses what the contract needs is never
 * validated (JUR-06); validated, the banner says the next real action. */
export async function reviewLegalForm(
  projectId: string,
  formId: string,
  accept: boolean,
): Promise<WriteResult> {
  const t = fr.legalForms.page;
  const parsed = formAction.safeParse({ projectId, formId });
  const access = await requireApproved();
  if (!parsed.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const submission = await submissionOf(parsed.data.formId);
  if (!submission || ficheMissing(submission).length > 0)
    return { ok: false, error: t.incomplete };
  return legalOutcome(parsed.data.projectId, t.validated, () =>
    run({ projectId, formId }, (supabase, id) =>
      supabase.rpc("review_legal_form", {
        p_form_id: id,
        p_accept: accept === true,
      }),
    ),
  );
}

/** « Redemander ce qui manque » (JUR-06): the person's private link then
 * shows only these fields, with the team's message. Only fields of the
 * fiche, still missing, are asked. */
export async function requestLegalFormComplement(
  projectId: string,
  formId: string,
  note: string,
): Promise<WriteResult> {
  const t = fr.legalForms.page;
  const parsed = formAction.safeParse({ projectId, formId });
  const access = await requireApproved();
  if (!parsed.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const submission = await submissionOf(parsed.data.formId);
  const fields = submission ? ficheMissing(submission) : [];
  if (fields.length === 0) return { ok: false, error: t.failed };
  return legalOutcome(parsed.data.projectId, t.complementAsked, () =>
    run({ projectId, formId }, (supabase, id) =>
      supabase.rpc("request_legal_form_complement", {
        p_form_id: id,
        p_fields: fields,
        p_note: note.trim().slice(0, 2000) || null,
      }),
    ),
  );
}

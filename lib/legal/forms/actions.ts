"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { emailContact } from "@/lib/email/contact-email";
import { projectTitleOf } from "@/lib/email/outcome";
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
import { ensureContactLink } from "@/lib/portal/ensure-contact-link";
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
  // `emailed`: what PDS OS did itself: « sent » (the fiche left by e-mail
  // and is marked sent), « failed » (copy the link), « disabled » (no SMTP
  // or no address: the manual way, as before).
  | {
      ok: true;
      url: string;
      email: string | null;
      project: string;
      emailed: "sent" | "failed" | "disabled";
    }
  | { ok: false; error: string };

/**
 * Prepares the fiche of one credited person: their contact (created from the
 * credit if nobody of that name is in the Réseau, credits linked; a namesake
 * is linked first with « Relier », never here), a new link (the
 * previous one revoked). The person is found again on the server from the
 * project's credits, never taken from the browser. The link is returned
 * once: only its hash is kept. `send`: PDS OS e-mails it with `message`
 * (the e-mail shown before it leaves, Sacha 06/11/2026); false = only the
 * link, sent by the person's usual channel (« Copier le lien plutôt »).
 */
export async function prepareLegalForm(
  projectId: string,
  personKey: string,
  options: { send?: boolean; message?: string } = {},
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
  const message = options.message?.trim().slice(0, 2000) || null;
  const emailed =
    options.send === false
      ? "disabled"
      : await emailFiche(project.id, data[0].form_id, project.title, message);
  // Not e-mailed: the person's page is the link to send by hand (one link
  // per person, Sacha 06/11/2026); the fiche is on it.
  if (emailed !== "sent") {
    const contactId = await formContactId(data[0].form_id);
    if (contactId) await ensureContactLink(project.id, contactId);
  }
  revalidatePath(routes.projectLegal(project.id), "layout");
  return {
    ok: true,
    url: `${siteUrl()}${routes.legalForm(token)}`,
    email: contact?.email ?? null,
    project: project.title,
    emailed,
  };
}

/** The contact a fiche was made for. */
async function formContactId(formId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("legal_forms")
    .select("contact_id")
    .eq("id", formId)
    .maybeSingle();
  return data?.contact_id ?? null;
}

/** E-mails the person their page (the fiche is on it) and marks the fiche
 * sent; never fails the gesture (Sacha, 05/11/2026). */
async function emailFiche(
  projectId: string,
  formId: string,
  title: string,
  // The message written in the step, else the usual one.
  message: string | null = null,
): Promise<"sent" | "failed" | "disabled"> {
  const t = fr.legalForms.page.emailed;
  const contactId = await formContactId(formId);
  if (!contactId) return "disabled";
  const sent = await emailContact({
    projectId,
    contactId,
    subject: t.subject(title),
    body: message ?? t.body,
    open: t.open,
  });
  if (sent === "sent") {
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_legal_form_state", {
      p_form_id: formId,
      p_state: "sent",
    });
    if (error) console.error("emailFiche mark:", error.message);
  }
  return sent;
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

/** « Marquer la fiche comme envoyée »: sent by the person's usual channel
 * with their page's link, which is marked sent too (it holds the fiche). */
export async function markFicheSent(
  projectId: string,
  formId: string,
): Promise<FormActionResult> {
  const result = await setLegalFormState(projectId, formId, "sent");
  if (!result.ok) return result;
  const contactId = await formContactId(formId);
  const link = contactId ? await ensureContactLink(projectId, contactId) : null;
  if (link) {
    const supabase = await createClient();
    const { error } = await supabase.rpc("mark_contact_link_sent", {
      p_link_id: link.id,
    });
    if (error && error.code !== "42501")
      console.error("markFicheSent link:", error.code, error.message);
  }
  revalidatePath(routes.projectLegal(projectId), "layout");
  return result;
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
  const result = await legalOutcome(
    parsed.data.projectId,
    t.complementAsked,
    () =>
      run({ projectId, formId }, (supabase, id) =>
        supabase.rpc("request_legal_form_complement", {
          p_form_id: id,
          p_fields: fields,
          p_note: note.trim().slice(0, 2000) || null,
        }),
      ),
  );
  if (!result.ok) return result;
  // The message goes to the person by e-mail when PDS OS can send it.
  const contactId = await formContactId(parsed.data.formId);
  if (!contactId) return result;
  const title = await projectTitleOf(parsed.data.projectId);
  const sent = await emailContact({
    projectId: parsed.data.projectId,
    contactId,
    // The address they wrote in their fiche, when they corrected it.
    email: submission?.person.email ?? null,
    subject: t.emailed.complementSubject(title),
    body: t.emailed.complementBody(note.trim().slice(0, 2000)),
    open: t.emailed.open,
  });
  return sent === "sent"
    ? { ...result, done: t.emailed.complementSent }
    : sent === "failed"
      ? { ...result, notice: t.emailed.complementFailed }
      : result;
}

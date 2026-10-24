import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { formPeople, type FormPerson } from "@/lib/legal/forms/people";
import { readInventoryRows } from "@/lib/legal/inventory-rows";
import { unsealLinkToken } from "@/lib/legal/forms/link-seal";
import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { createClient } from "@/lib/supabase/server";

// The project's fiches de renseignements, read with the viewer's session
// (RLS: manage_legal on a visible project).

export type FormState =
  | "none"
  | "link_generated"
  | "sent"
  | "action_required"
  | "complete"
  | "expired"
  | "revoked";

export type FormSubmission = {
  roles: string[];
  otherRole: string | null;
  person: Record<string, string>;
  contribution: Record<string, string>;
  corrections: Record<string, { before: string; after: string }>;
  submittedAt: string;
};

export type FormRow = FormPerson & {
  formId: string | null;
  state: FormState;
  // When the state began (sent, submitted, completed).
  since: string | null;
  // When the person opened their link, while it waits (JUR-11).
  openedAt: string | null;
  // The private link, kept visible while it is open (rule 19): its URL
  // when the server can unseal it, when it was created and sent, by whom,
  // until when it is valid.
  link: {
    url: string | null;
    createdAt: string;
    sentAt: string | null;
    sentBy: string | null;
    expiresAt: string;
  } | null;
  // Why the access was revoked, when it was.
  revokedReason: string | null;
  submission: FormSubmission | null;
  // What the team asked again, while the person has not answered (JUR-06).
  complement: { fields: string[]; note: string | null; at: string } | null;
};

const asText = (value: unknown): Record<string, string> =>
  value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          String(v ?? ""),
        ]),
      )
    : {};

export async function loadForms(
  project: {
    id: string;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
): Promise<FormRow[]> {
  const supabase = await createClient();
  const [rows, forms] = await Promise.all([
    readInventoryRows(
      project.id,
      project.masters,
      can(access, "manage_catalog"),
    ),
    supabase
      .from("legal_forms")
      .select(
        "id, contact_id, status, expires_at, sent_at, sent_by, submitted_at, completed_at, created_at, opened_at, link_sealed, revoked_reason, complement_fields, complement_note, complement_requested_at",
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
  ]);
  if (forms.error) console.error("loadForms:", forms.error.message);

  // The latest fiche of each contact (rows come newest first).
  const latest = new Map<string, NonNullable<typeof forms.data>[number]>();
  for (const form of forms.data ?? [])
    if (!latest.has(form.contact_id)) latest.set(form.contact_id, form);

  const formIds = [...latest.values()].map((f) => f.id);
  const submissions =
    formIds.length > 0
      ? await supabase
          .from("legal_form_submissions")
          .select(
            "form_id, roles, other_role, person, contribution, corrections, created_at",
          )
          .in("form_id", formIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
  if (submissions.error)
    console.error("loadForms submissions:", submissions.error.message);
  const submissionOf = new Map<string, FormSubmission>();
  for (const s of submissions.data ?? [])
    if (!submissionOf.has(s.form_id))
      submissionOf.set(s.form_id, {
        roles: s.roles,
        otherRole: s.other_role,
        person: asText(s.person),
        contribution: asText(s.contribution),
        corrections: Object.fromEntries(
          Object.entries(
            (s.corrections ?? {}) as Record<
              string,
              { before: unknown; after: unknown }
            >,
          ).map(([k, v]) => [
            k,
            { before: String(v?.before ?? ""), after: String(v?.after ?? "") },
          ]),
        ),
        submittedAt: s.created_at,
      });

  const senders = [
    ...new Set(
      [...latest.values()].flatMap((f) => (f.sent_by ? [f.sent_by] : [])),
    ),
  ];
  const { data: people } = senders.length
    ? await supabase
        .from("people")
        .select("id, first_name, last_name")
        .in("id", senders)
    : { data: [] };
  const nameOf = new Map(
    (people ?? []).map((p) => [
      p.id,
      [p.first_name, p.last_name].filter(Boolean).join(" "),
    ]),
  );

  const now = new Date().toISOString();
  return formPeople(rows).map((person): FormRow => {
    const form = person.contactId ? latest.get(person.contactId) : undefined;
    if (!form)
      return {
        ...person,
        formId: null,
        state: "none",
        since: null,
        openedAt: null,
        link: null,
        revokedReason: null,
        submission: null,
        complement: null,
      };
    const open = form.status === "link_generated" || form.status === "sent";
    // A complement asked keeps the link usable (JUR-06).
    const asked =
      form.status === "action_required" &&
      form.complement_requested_at !== null &&
      form.expires_at >= now;
    const state: FormState =
      open && form.expires_at < now ? "expired" : (form.status as FormState);
    return {
      ...person,
      formId: form.id,
      state,
      since:
        form.completed_at ??
        form.submitted_at ??
        form.sent_at ??
        form.created_at,
      openedAt: open ? form.opened_at : null,
      link:
        open || asked
          ? {
              url: ((token) =>
                token ? `${siteUrl()}${routes.legalForm(token)}` : null)(
                unsealLinkToken(form.link_sealed),
              ),
              createdAt: form.created_at,
              sentAt: form.sent_at,
              sentBy: form.sent_by ? (nameOf.get(form.sent_by) ?? null) : null,
              expiresAt: form.expires_at,
            }
          : null,
      revokedReason: form.status === "revoked" ? form.revoked_reason : null,
      submission: submissionOf.get(form.id) ?? null,
      complement:
        form.status === "action_required" && form.complement_requested_at
          ? {
              fields: form.complement_fields ?? [],
              note: form.complement_note,
              at: form.complement_requested_at,
            }
          : null,
    };
  });
}

/** Whether each person of the project has a complete fiche (the Suivi). */
export async function completeFormContacts(
  projectId: string,
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_forms")
    .select("contact_id")
    .eq("project_id", projectId)
    .eq("status", "complete");
  if (error) console.error("completeFormContacts:", error.message);
  return new Set((data ?? []).map((row) => row.contact_id));
}

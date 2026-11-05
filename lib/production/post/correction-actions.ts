"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { emailMessage } from "@/lib/email/link-email";
import { projectTitleOf } from "@/lib/email/outcome";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import {
  holderSchema,
  invalidPost,
  optionalText,
  postFailure,
  type PostResult,
} from "@/lib/production/post/result";
import { prepDone } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

// « Demander des corrections » addressed to someone (PROD-030 to PROD-032):
// the feedback kept, who must act, by when, a message; then transmitted (a
// member is notified in the app; a Réseau contact is e-mailed the text by
// PDS OS when it can, else the text is copied and sent by hand). The rules live in the database (request_production_corrections…).

const isoDate = z.iso.date();

const requestSchema = z.object({
  projectId: z.uuid(),
  versionId: z.uuid(),
  commentIds: z.array(z.uuid()).max(500),
  recipient: holderSchema,
  dueOn: isoDate,
  message: optionalText(4000),
});

export async function requestCorrections(
  input: z.input<typeof requestSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const r = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_production_corrections", {
    p_version_id: r.versionId,
    p_comment_ids: r.commentIds,
    p_person_id: r.recipient.personId,
    p_contact_id: r.recipient.contactId,
    p_due_on: r.dueOn,
    p_message: r.message,
  });
  return error ? postFailure(error) : prepDone(r.projectId);
}

const updateSchema = z.object({
  projectId: z.uuid(),
  requestId: z.uuid(),
  recipient: holderSchema,
  dueOn: isoDate,
  message: optionalText(4000),
});

/** « Réaffecter ou changer l'échéance »: the same request, never a copy. */
export async function updateCorrections(
  input: z.input<typeof updateSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const r = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_production_corrections", {
    p_request_id: r.requestId,
    p_person_id: r.recipient.personId,
    p_contact_id: r.recipient.contactId,
    p_due_on: r.dueOn,
    p_message: r.message,
  });
  return error ? postFailure(error) : prepDone(r.projectId);
}

const sendSchema = z.object({
  projectId: z.uuid(),
  requestId: z.uuid(),
  // The text the screen shows and copies: what the contact is e-mailed.
  text: z.string().trim().max(10000).optional(),
});

/** « Transmettre » or « Relancer »: marks the request sent, and e-mails
 * its text to the Réseau contact who must act (Sacha, 05/11/2026). */
export async function sendCorrections(
  input: z.input<typeof sendSchema>,
): Promise<PostResult & { done?: string }> {
  await requireApproved();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_production_corrections", {
    p_request_id: parsed.data.requestId,
  });
  if (error) return postFailure(error);
  await schedulePendingPushes();
  const done = prepDone(parsed.data.projectId);
  if (!parsed.data.text) return done;
  return { ...done, ...(await emailCorrections(parsed.data)) };
}

/** The contact's e-mail, when the request is addressed to one with an
 * address; the outcome is a `done` toast or a `notice`, never a failure. */
async function emailCorrections(input: {
  projectId: string;
  requestId: string;
  text?: string;
}): Promise<{ done?: string; notice?: string }> {
  const t = fr.productionCorrections.email;
  const supabase = await createClient();
  const { data: request } = await supabase
    .from("production_correction_requests")
    .select("contact_id")
    .eq("id", input.requestId)
    .maybeSingle();
  if (!request?.contact_id) return {};
  const { data: contact } = await supabase
    .from("network_contacts")
    .select("name, email")
    .eq("id", request.contact_id)
    .maybeSingle();
  if (!contact) return {};
  const sent = await emailMessage({
    to: { name: contact.name, email: contact.email },
    subject: t.subject(await projectTitleOf(input.projectId)),
    text: `${fr.linkEmail.greeting(contact.name)}\n\n${t.intro}\n\n${input.text ?? ""}`,
  });
  if (sent === "sent") return { done: t.sent(contact.name) };
  return sent === "failed" ? { notice: t.failed } : {};
}

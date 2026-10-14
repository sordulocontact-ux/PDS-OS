"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
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
// the feedback kept, who must act, by when, a message; then transmitted
// (PDS OS sends no e-mail: the text is copied, a member is notified in the
// app). The rules live in the database (request_production_corrections…).

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

const sendSchema = z.object({ projectId: z.uuid(), requestId: z.uuid() });

/** « Transmettre » or « Relancer », once the text is copied. */
export async function sendCorrections(
  input: z.input<typeof sendSchema>,
): Promise<PostResult> {
  await requireApproved();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return invalidPost;
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_production_corrections", {
    p_request_id: parsed.data.requestId,
  });
  if (error) return postFailure(error);
  await schedulePendingPushes();
  return prepDone(parsed.data.projectId);
}

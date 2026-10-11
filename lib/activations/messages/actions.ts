"use server";

import { z } from "zod";

import { MESSAGE_CHANNELS, MESSAGE_KINDS } from "@/lib/activations/model";
import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const e = fr.activationWork.errors;

const saveSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  messageId: z.uuid().nullable(),
  targetId: z.uuid().nullable(),
  kind: z.enum(MESSAGE_KINDS),
  subject: z.string().max(300),
  body: z.string().max(20000),
  channel: z.enum(MESSAGE_CHANNELS),
  pressKitDocumentId: z.uuid().nullable(),
  dueOn: z.union([z.iso.date(), z.literal("")]),
  derogationReason: z.string().max(1000),
});

/** A draft, created or edited (only a draft changes : the database refuses
 * the rest). A follow-up after a refusal, an open opportunity or a closure
 * needs its written reason. */
export async function saveMessage(
  input: z.input<typeof saveSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  if (!v.body.trim()) return invalid(e.bodyRequired);
  const values = {
    subject: textOrNull(v.subject),
    body: v.body.trim(),
    channel: v.channel,
    press_kit_document_id: v.pressKitDocumentId,
    due_on: textOrNull(v.dueOn),
    derogation_reason: textOrNull(v.derogationReason),
  };
  const supabase = await createClient();
  const { error } = v.messageId
    ? await supabase
        .from("activation_messages")
        .update(values)
        .eq("id", v.messageId)
    : await supabase.from("activation_messages").insert({
        ...values,
        activation_id: v.activationId,
        target_id: v.targetId,
        kind: v.kind,
        organization_id: access.organizationId ?? "",
        project_id: v.projectId,
      });
  if (error?.message.includes("follow_up_blocked"))
    return invalid(e.followUpBlocked);
  if (error?.message.includes("message_not_draft")) return invalid(e.notDraft);
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const advanceSchema = z.object({
  projectId: z.uuid(),
  messageId: z.uuid(),
  action: z.enum([
    "submit",
    "validate",
    "request_changes",
    "declare_sent",
    "cancel",
  ]),
  comment: z.string().max(2000),
  sentOn: z.union([z.iso.date(), z.literal("")]),
  proofUrl: z.union([z.url({ protocol: /^https?$/ }).max(2000), z.literal("")]),
});

/** Moves a message on ; « declare_sent » needs the date it left (never set
 * by validation alone). */
export async function advanceMessage(
  input: z.input<typeof advanceSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = advanceSchema.safeParse(input);
  if (!parsed.success) return invalid(fr.activations.errors.urlInvalid);
  const v = parsed.data;
  if (v.action === "declare_sent" && !v.sentOn)
    return invalid(fr.activations.errors.dateRequired);
  const supabase = await createClient();
  const { error } = await supabase.rpc("advance_activation_message", {
    p_message_id: v.messageId,
    p_action: v.action,
    p_comment: v.comment,
    p_sent_on: v.sentOn || null,
    p_proof_url: v.proofUrl || null,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

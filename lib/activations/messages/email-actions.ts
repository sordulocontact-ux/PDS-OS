"use server";

import { z } from "zod";

import { activationDone } from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { emailMessage } from "@/lib/email/link-email";
import { projectTitleOf } from "@/lib/email/outcome";
import { emailEnabled } from "@/lib/email/send";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.activationWork.messages.email;

const schema = z.object({ projectId: z.uuid(), messageId: z.uuid() });

/**
 * « Envoyer par e-mail » on a validated message (press pitch, follow-up,
 * brief…): PDS OS sends the text itself to the target's address in the
 * Réseau (the journalist's, else the contact's) and declares it sent today
 * (Sacha, 05/11/2026). Only when it left: an e-mail that fails changes
 * nothing, and « Copier » / « Ouvrir dans la messagerie » / « Déclarer
 * l'envoi » stay the way. A message with a press kit attached stays manual
 * (PDS OS does not attach files).
 */
export async function emailActivationMessage(
  input: z.input<typeof schema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.failed };
  const v = parsed.data;
  if (!emailEnabled()) return { ok: false, error: t.noAddress };
  const supabase = await createClient();
  const { data: message } = await supabase
    .from("activation_messages")
    .select("status, channel, subject, body, target_id, press_kit_document_id")
    .eq("id", v.messageId)
    .maybeSingle();
  if (
    !message ||
    message.status !== "validated" ||
    message.channel !== "email" ||
    message.press_kit_document_id ||
    !message.target_id
  )
    return { ok: false, error: t.noAddress };
  const { data: target } = await supabase
    .from("activation_targets")
    .select("contact_id, journalist_contact_id")
    .eq("id", message.target_id)
    .maybeSingle();
  const contactId = target?.journalist_contact_id ?? target?.contact_id;
  const { data: contact } = contactId
    ? await supabase
        .from("network_contacts")
        .select("name, email")
        .eq("id", contactId)
        .maybeSingle()
    : { data: null };
  if (!contact?.email) return { ok: false, error: t.noAddress };
  const sent = await emailMessage({
    to: { name: contact.name, email: contact.email },
    subject:
      message.subject?.trim() || t.subject(await projectTitleOf(v.projectId)),
    text: message.body,
  });
  if (sent !== "sent") return { ok: false, error: t.failed };
  const { error } = await supabase.rpc("advance_activation_message", {
    p_message_id: v.messageId,
    p_action: "declare_sent",
    p_comment: "",
    p_sent_on: todayInParis(),
    p_proof_url: null,
  });
  if (error) {
    // It left: say so, and let the person declare it by hand.
    console.error("emailActivationMessage declare:", error.message);
    return { ok: false, error: t.declareFailed };
  }
  activationDone(v.projectId);
  return { ok: true, done: t.sent(contact.name) };
}

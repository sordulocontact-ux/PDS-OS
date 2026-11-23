"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { composeMessageEmail } from "@/lib/email/compose";
import { envelopeInput } from "@/lib/email/envelope";
import { sendEmail } from "@/lib/email/send";
import { getServerEnv } from "@/lib/env";
import { core } from "@/lib/i18n/fr/core";
import { mailboxCompose } from "@/lib/i18n/fr/mailbox-compose";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = mailboxCompose;

const input = z.object({
  envelope: envelopeInput,
  subject: z.string().trim().min(1).max(500),
  message: z.string().trim().min(1).max(20000),
  replyToId: z.uuid().optional(),
});
export type SendMailboxMailInput = z.input<typeof input>;

const SNIPPET = 280;

/**
 * « Écrire un mail » and « Répondre » on the page « Mails »: sent by
 * `sendEmail` from PO's address in the member's name (replies to the member,
 * then to PO's own address so they come back into the mailbox), then
 * recorded at once in « Envoyés » under the member's session (RLS: theirs
 * only). A failed record is only logged: the cron copies the e-mail from
 * Gmail's Sent folder by its Message-ID.
 */
export async function sendMailboxMail(
  raw: SendMailboxMailInput,
): Promise<WriteResult> {
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: t.errors.invalid };
  const access = await requireApproved();
  if (!access.organizationId || !access.personId)
    return { ok: false, error: t.errors.invalid };
  const supabase = await createClient();

  let inReplyTo: string | undefined;
  let references: string[] = [];
  if (p.data.replyToId) {
    // Read under the session: only a message the member may see.
    const { data: origin } = await supabase
      .from("mailbox_messages")
      .select("message_id, thread_ids")
      .eq("id", p.data.replyToId)
      .maybeSingle();
    if (!origin) return { ok: false, error: t.errors.notFound };
    inReplyTo = origin.message_id;
    references = [...new Set([...origin.thread_ids, origin.message_id])];
  }

  const poAddress = getServerEnv().EMAIL_SMTP_USER;
  const sender =
    [access.firstName, access.lastName].filter(Boolean).join(" ") ||
    (access.email ?? "PDS");
  const { to, cc, bcc } = p.data.envelope;
  const [first, ...alsoTo] = to;
  const composed = composeMessageEmail({
    text: p.data.message,
    signature: core.linkEmail.signature(sender),
    sender,
    subject: p.data.subject,
  });
  const sent = await sendEmail({
    to: { name: first, email: first },
    alsoTo,
    cc,
    bcc,
    subject: p.data.subject,
    ...composed,
    sender: { name: sender, email: access.email },
    replyTo: poAddress ? [poAddress] : undefined,
    inReplyTo,
    references,
  });
  if (!sent.ok)
    return {
      ok: false,
      error: sent.reason === "disabled" ? t.errors.disabled : t.errors.failed,
    };

  const { error } = await supabase.from("mailbox_messages").insert({
    organization_id: access.organizationId,
    folder: "sent",
    message_id: sent.messageId,
    person_ids: [access.personId],
    thread_ids: references,
    from_name: `${sender} · PDS`,
    from_address: poAddress ?? null,
    to_addresses: to.map((a) => a.toLowerCase()),
    cc_addresses: cc.map((a) => a.toLowerCase()),
    names: {},
    subject: p.data.subject,
    sent_at: new Date().toISOString(),
    snippet: composed.text.replace(/\s+/g, " ").trim().slice(0, SNIPPET),
    body_text: composed.text,
  });
  // Sent, not recorded: the cron copies it from Gmail's Sent folder.
  if (error) console.error("sendMailboxMail record:", error.code);

  revalidatePath(routes.mailbox);
  return { ok: true, done: t.done };
}

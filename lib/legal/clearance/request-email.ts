import "server-only";

import { emailMessage } from "@/lib/email/link-email";
import { clearanceReplyAddress } from "@/lib/email/reply-address";
import { createClient } from "@/lib/supabase/server";

export type RequestRecipient = {
  name: string;
  email: string;
  contactId: string | null;
};

/**
 * The authorisation request sent by PDS OS (Sacha, 07/11/2026: « l'envoyer
 * directement depuis ici »): the text the person wrote, one e-mail per
 * rights holder, their signature added by `emailMessage`; replies go to the
 * member and to PO's address of this request, which files them (cron). An address typed
 * for a contact of the Réseau who had none is kept on their fiche, so it is
 * never typed again (never fails the sending).
 */
export async function emailClearanceRequest(
  clearanceId: string,
  recipients: RequestRecipient[],
  subject: string,
  message: string,
): Promise<{ sent: string[]; missed: string[] }> {
  const supabase = await createClient();
  const sent: string[] = [];
  const missed: string[] = [];
  // Their reply also reaches PO, which files it in the request's journal.
  const po = clearanceReplyAddress(clearanceId);
  for (const r of recipients) {
    const outcome = await emailMessage({
      to: { name: r.name, email: r.email },
      subject,
      text: message,
      replyTo: po ? [po] : undefined,
    });
    if (outcome !== "sent") {
      missed.push(r.name);
      continue;
    }
    sent.push(r.name);
    if (!r.contactId) continue;
    const { error } = await supabase
      .from("network_contacts")
      .update({ email: r.email })
      .eq("id", r.contactId)
      .is("email", null);
    if (error) console.error("emailClearanceRequest contact:", error.message);
  }
  return { sent, missed };
}

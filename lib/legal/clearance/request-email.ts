import "server-only";

import { emailMessage } from "@/lib/email/link-email";
import type { EmailAttachment } from "@/lib/email/send";
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
 * never typed again; for a holder kept by name only, on the holder (never
 * fails the sending). The authorisation contract
 * leaves the same way, joined as `attachments` (Sacha, 09/11/2026).
 */
export async function emailClearanceRequest(
  clearanceId: string,
  recipients: RequestRecipient[],
  subject: string,
  message: string,
  attachments?: EmailAttachment[],
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
      attachments,
      replyTo: po ? [po] : undefined,
    });
    if (outcome !== "sent") {
      missed.push(r.name);
      continue;
    }
    // The journal keeps to which address it went: the proof of sending.
    sent.push(`${r.name} (${r.email})`);
    if (!r.contactId) {
      await keepOnHolder(supabase, clearanceId, r);
      continue;
    }
    const { error } = await supabase
      .from("network_contacts")
      .update({ email: r.email })
      .eq("id", r.contactId)
      .is("email", null);
    if (error) console.error("emailClearanceRequest contact:", error.message);
  }
  return { sent, missed };
}

// A holder kept by name only: the address stays on them (Sacha, 09/11/2026),
// for the contract's e-mail and the replies.
async function keepOnHolder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clearanceId: string,
  r: RequestRecipient,
) {
  const { data: holders } = await supabase
    .from("legal_clearance_rightsholders")
    .select("id")
    .eq("clearance_id", clearanceId)
    .eq("name", r.name)
    .is("contact_id", null);
  for (const h of holders ?? []) {
    const { error } = await supabase.rpc("keep_clearance_holder_email", {
      p_holder_id: h.id,
      p_email: r.email,
    });
    if (error) console.error("emailClearanceRequest holder:", error.message);
  }
}

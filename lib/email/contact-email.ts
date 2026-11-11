import "server-only";

import { emailLink, siteUrl } from "@/lib/email/link-email";
import { emailEnabled } from "@/lib/email/send";
import { core } from "@/lib/i18n/fr/core";
import { ensureContactLink } from "@/lib/portal/ensure-contact-link";
import { createClient } from "@/lib/supabase/server";
import { contactAddressOf } from "@/lib/network/private-details";
import { formatDay } from "@/lib/utils/day";

const t = core.linkEmail;

export type ContactEmail = {
  projectId: string;
  // The Réseau contact who receives it; their page by project is the link.
  contactId: string;
  subject: string;
  // After « Bonjour Karim, »: what happened, what is awaited.
  body: string;
  // « Ouvrir votre dossier : », « Voir la décision : »…
  open: string;
  // The card of their page to open on (« ps-package », « ps-versions »…).
  anchor?: string;
  // An address the person gave themselves and not yet in the Réseau (their
  // fiche's correction, waiting for its check): used instead (Sacha,
  // 06/11/2026: « j'ai remplacé le mail … mais j'ai rien reçu »).
  email?: string | null;
};

/**
 * An e-mail to someone outside the team about what PDS awaits from them
 * or just decided (Sacha, 05/11/2026: « l'e-mail automatique partout, pour
 * les envois et les retours »): their page by project is the one link
 * (lot 11), made if needed, opened on the right card, and marked sent.
 * Nothing when PDS OS cannot send (no SMTP, no address, no link): the page
 * still shows it, as before. Never fails the gesture that called it.
 */
export async function emailContact(
  mail: ContactEmail,
): Promise<"sent" | "failed" | "disabled"> {
  if (!emailEnabled()) return "disabled";
  const supabase = await createClient();
  // A private contact's address only for whoever may read it (BIZ 8).
  const contact = await contactAddressOf(supabase, mail.contactId);
  const to = mail.email?.trim() || contact?.email;
  if (!contact || !to) return "disabled";
  const link = await ensureContactLink(mail.projectId, mail.contactId);
  if (!link) return "disabled";
  const { data: row } = await supabase
    .from("project_contact_links")
    .select("expires_at")
    .eq("id", link.id)
    .maybeSingle();
  const sent = await emailLink({
    to: { name: contact.name, email: to },
    subject: mail.subject,
    message: `${t.greeting(contact.name)}\n\n${mail.body}`,
    open: mail.open,
    url: siteUrl(`/c/${link.token}${mail.anchor ? `#${mail.anchor}` : ""}`),
    validity: row?.expires_at ? t.validity(formatDay(row.expires_at)) : null,
  });
  if (sent === "sent") {
    const { error } = await supabase.rpc("mark_contact_link_sent", {
      p_link_id: link.id,
    });
    // Only the owner marks it: someone else's e-mail still left.
    if (error && error.code !== "42501")
      console.error("emailContact mark:", error.code, error.message);
  }
  return sent;
}

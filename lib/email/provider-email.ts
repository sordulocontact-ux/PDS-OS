import "server-only";

import { emailLink, siteUrl } from "@/lib/email/link-email";
import { emailEnabled } from "@/lib/email/send";
import { core } from "@/lib/i18n/fr/core";
import { createClient } from "@/lib/supabase/server";

export type ProviderEmail = {
  // The Réseau contact who holds the link; no address: nothing is sent.
  contactId: string;
  // The token the database just made (shown once, never stored in clear).
  token: string;
  subject: string;
  // After « Bonjour Karim, »: what this space is for.
  body: string;
  open: string;
};

/**
 * E-mails a provider (or the retained director) their private space `/p/…`
 * right after its creation, while the token is in hand (Sacha, 05/11/2026:
 * « l'e-mail automatique partout »). « disabled »: no SMTP or no address in
 * the Réseau, the link stays shown once to copy. Never fails the gesture.
 */
export async function emailProviderLink(
  mail: ProviderEmail,
): Promise<"sent" | "failed" | "disabled"> {
  if (!emailEnabled()) return "disabled";
  const supabase = await createClient();
  const { data: contact } = await supabase
    .from("network_contacts")
    .select("name, email")
    .eq("id", mail.contactId)
    .maybeSingle();
  if (!contact?.email) return "disabled";
  return emailLink({
    to: { name: contact.name, email: contact.email },
    subject: mail.subject,
    message: `${core.linkEmail.greeting(contact.name)}\n\n${mail.body}`,
    open: mail.open,
    url: siteUrl(`/p/${mail.token}`),
  });
}

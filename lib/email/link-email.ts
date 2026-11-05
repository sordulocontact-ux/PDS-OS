import "server-only";

import { requireApproved } from "@/lib/auth/dal";
import {
  type EmailAttachment,
  emailEnabled,
  sendEmail,
} from "@/lib/email/send";
import { getPublicEnv } from "@/lib/env";
import { core } from "@/lib/i18n/fr/core";

const t = core.linkEmail;

/** The app's address of a path (« /c/<token> »), for an e-mail. */
export function siteUrl(path: string): string {
  return `${getPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}${path}`;
}

export type LinkEmail = {
  // The person outside the team; no address: nothing is sent.
  to: { name: string; email: string | null };
  subject: string;
  // What the member says (« Bonjour Karim, … »), the link comes after.
  message: string;
  // « Ouvrir votre dossier : », « Signer le contrat : »…
  open: string;
  url: string;
  // « Lien privé, sans compte, valable jusqu'au … ».
  validity?: string | null;
};

/**
 * Every e-mail PDS OS sends to someone outside the team carries a private
 * link (Sacha, 05/11/2026: « l'e-mail automatique partout »): the message,
 * the link and its validity, then the member's signature, from PO's
 * address in the member's name, replies going back to them
 * (lib/email/send.ts). « disabled »: no SMTP or no address — the sending
 * stays declared by hand (« Marquer comme envoyé »), as before. The caller
 * marks the object sent only on « sent ».
 */
export async function emailLink(
  mail: LinkEmail,
): Promise<"sent" | "failed" | "disabled"> {
  if (!emailEnabled() || !mail.to.email) return "disabled";
  const { sender, email } = await currentSender();
  const sent = await sendEmail({
    to: { name: mail.to.name, email: mail.to.email },
    subject: mail.subject,
    text: [
      mail.message.trim(),
      "",
      `${mail.open} ${mail.url}`,
      ...(mail.validity ? [mail.validity] : []),
      "",
      t.signature(sender),
      "",
    ].join("\n"),
    sender: { name: sender, email },
  });
  return outcomeOf(sent);
}

/** The member who sends: their name, and the address replies go back to. */
async function currentSender(): Promise<{
  sender: string;
  email: string | null;
}> {
  const access = await requireApproved();
  return {
    sender:
      [access.firstName, access.lastName].filter(Boolean).join(" ") ||
      (access.email ?? "PDS"),
    email: access.email,
  };
}

function outcomeOf(
  sent: Awaited<ReturnType<typeof sendEmail>>,
): "sent" | "failed" | "disabled" {
  return sent.ok ? "sent" : sent.reason === "disabled" ? "disabled" : "failed";
}

export type MessageEmail = {
  to: { name: string; email: string | null };
  subject: string;
  // The whole message, as the member wrote or approved it (no link added).
  text: string;
  attachments?: EmailAttachment[];
};

/**
 * An e-mail that carries a message and no link (a brief, a recap, a call
 * summary, a press pitch): the text itself, then the member's signature,
 * same sender as `emailLink`. « disabled »: no SMTP or no address, the
 * manual way stays.
 */
export async function emailMessage(
  mail: MessageEmail,
): Promise<"sent" | "failed" | "disabled"> {
  if (!emailEnabled() || !mail.to.email) return "disabled";
  const { sender, email } = await currentSender();
  const sent = await sendEmail({
    to: { name: mail.to.name, email: mail.to.email },
    subject: mail.subject,
    text: [mail.text.trim(), "", t.signature(sender), ""].join("\n"),
    sender: { name: sender, email },
    attachments: mail.attachments,
  });
  return outcomeOf(sent);
}

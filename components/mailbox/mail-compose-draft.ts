import type { MailEnvelope } from "@/lib/email/addresses";
import { mailboxCompose } from "@/lib/i18n/fr/mailbox-compose";
import type { MailboxMessage } from "@/lib/mailbox/types";

/** What the writing window opens with: empty to write, filled to answer. */
export type MailDraft = {
  envelope: MailEnvelope;
  message: string;
  replyToId?: string;
};

export const emptyDraft: MailDraft = {
  envelope: { to: "", cc: "", bcc: "", subject: "" },
  message: "",
};

/** « Re : objet », without doubling an « Re: » or « Re : » already there. */
export function replySubject(subject: string): string {
  const bare = subject.replace(/^\s*(re\s*:\s*)+/i, "").trim();
  return `${mailboxCompose.replyPrefix}${bare}`;
}

/** To the sender of a received message, to the « À » of a sent one. */
export function replyDraft(message: MailboxMessage): MailDraft {
  const to =
    message.folder === "sent"
      ? message.to.join(", ")
      : (message.fromAddress ?? "");
  return {
    envelope: { to, cc: "", bcc: "", subject: replySubject(message.subject) },
    message: "",
    replyToId: message.id,
  };
}

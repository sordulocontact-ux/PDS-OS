import { mailbox } from "@/lib/i18n/fr/mailbox";
import type { MailboxMessage } from "@/lib/mailbox/types";

type Who = { name: string | null; address: string };

const label = ({ name, address }: Who) => name || address;

/** A recipient as the message wrote it: its name when it gave one. */
export const recipient = (message: MailboxMessage, address: string): Who => ({
  name: message.names[address] ?? null,
  address,
});

/** The sender, null when the message has neither a name nor an address. */
export function senderOf(message: MailboxMessage): Who | null {
  return message.fromAddress
    ? { name: message.fromName, address: message.fromAddress }
    : message.fromName
      ? { name: message.fromName, address: message.fromName }
      : null;
}

/** The correspondent of a row: who wrote a received mail, « À » and who it
 * was sent to for a sent one. */
export function correspondentOf(message: MailboxMessage): string {
  if (message.folder === "sent") {
    const names = message.to.map((a) => label(recipient(message, a)));
    return names.length > 0
      ? `${mailbox.to} ${names.join(", ")}`
      : mailbox.noName;
  }
  const sender = senderOf(message);
  return sender ? label(sender) : mailbox.noName;
}

/** « Nom <adresse> », or the address alone. */
export function whoLine({ name, address }: Who): string {
  return name && name !== address ? `${name} <${address}>` : address;
}

/** What the instant search reads: subject, snippet, names and addresses. */
export function searchTextOf(message: MailboxMessage): (string | null)[] {
  return [
    message.subject,
    message.snippet,
    message.fromName,
    message.fromAddress,
    ...message.to,
    ...message.cc,
    ...Object.values(message.names),
  ];
}

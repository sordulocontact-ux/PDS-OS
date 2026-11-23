// The page « Mails » (Sacha 23/11/2026): PO's mailbox as the app shows it,
// shared by the page, the side sheet, the writing dialog and PO's reading.

export type MailboxFolder = "inbox" | "sent";

// What a message is, computed by code at each reading (lib/mailbox/kinds.ts),
// never stored, never by the AI.
export const MAIL_KINDS = [
  "signature",
  "quote",
  "invoice",
  "contract",
  "proof",
  "deal_memo",
  "clearance",
] as const;
export type MailKind = (typeof MAIL_KINDS)[number];

export type MailboxAttachment = {
  part: string;
  name: string;
  type: string;
  size: number;
};

// Where PDS OS filed it: the deal, the authorisation request, the proofs.
export type MailboxLink = { href: string; label: string };

export type MailboxMessage = {
  id: string;
  folder: MailboxFolder;
  // The e-mail's Message-ID and its thread (In-Reply-To then References).
  messageId: string;
  threadIds: string[];
  fromName: string | null;
  fromAddress: string | null;
  to: string[];
  cc: string[];
  // Address → name, as written in the message.
  names: Record<string, string>;
  subject: string;
  sentAt: string;
  snippet: string;
  attachments: MailboxAttachment[];
  kinds: MailKind[];
  link: MailboxLink | null;
  // A mail of the member's own Gmail (« Mon Gmail »), read live, never
  // stored: the account it is read from and its id at Gmail. Null for a
  // mail of PDS OS's box.
  gmail: { account: string; email: string; id: string } | null;
};

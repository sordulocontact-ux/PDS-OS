import "server-only";

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import { entryOf, type InboxEntry } from "@/lib/email/inbox-entries";
import { replyText } from "@/lib/email/reply-text";
import { getServerEnv } from "@/lib/env";

/**
 * The single entry point for reading PO's mailbox (non-negotiable rule 2,
 * as lib/email/send.ts for sending): Gmail's IMAP with the same account and
 * app password as the sending (EMAIL_SMTP_USER / EMAIL_SMTP_PASSWORD).
 * Messages are fetched with BODY.PEEK: reading never marks them as read
 * in po@. Without the account or a password, `inboxEnabled()` is false and
 * nothing is read.
 */
export function inboxEnabled(): boolean {
  const env = getServerEnv();
  return Boolean(env.EMAIL_SMTP_USER && env.EMAIL_SMTP_PASSWORD);
}

export type InboxEnvelope = {
  uid: number;
  messageId: string;
  from: string | null;
  // To and Cc, lowercased.
  to: string[];
  subject: string;
  date: Date | null;
};

export type InboxMessage = {
  // Their words, the quoted history cut (lib/email/reply-text.ts).
  text: string;
  // The names of the files joined (kept in the mailbox, named in the journal).
  attachments: string[];
  // The PDFs joined, read: a signed contract coming back (Sacha, 09/11/2026).
  pdfs: Array<{ name: string; content: Uint8Array }>;
  // The photos joined (PNG, JPEG): a ticket sent to the box of proofs
  // (lib/finance/proof-email.ts).
  images: Array<{ name: string; type: string; content: Uint8Array }>;
  // The whole message as received (.eml): the proof of where a file came from.
  source: Uint8Array;
};

// The contract-files bucket's limit (50 Mo).
const MAX_FILE = 52_428_800;

export type Inbox = {
  // The envelopes (sender, recipients, subject: no content) of the last
  // `days`, newest last, `max` at most.
  recent: (days: number, max: number) => Promise<InboxEnvelope[]>;
  // One message's text, once it is known to be a reply to file.
  read: (uid: number) => Promise<InboxMessage | null>;
  // Whole messages for the page « Mails » (lib/mailbox/sync.ts): their
  // head, their text (the first MAX_SOURCE bytes read), the files joined
  // named from the body structure, never downloaded.
  entries: (uids: number[]) => Promise<InboxEntry[]>;
  // One file joined, read when a reader asks for it: by its UID, else
  // found by its Message-ID (an e-mail recorded from the app has no UID).
  attachment: (
    at: { uid: number | null; messageId: string },
    part: string,
  ) => Promise<InboxFile | null>;
};

export type InboxFile = { name: string; type: string; content: Uint8Array };

// Gmail's folders: the Inbox, or the Sent folder (where Gmail keeps what its
// SMTP sends, lib/email/send.ts), found by its special use, whatever the
// account's language names it.
export type InboxFolder = "inbox" | "sent";

// How much of a message is read for its text (the text comes before the
// files), and the largest file served.
const MAX_SOURCE = 1024 * 1024;
const MAX_ATTACHMENT = 25 * 1024 * 1024;

const address = (a?: { address?: string }) =>
  a?.address?.trim().toLowerCase() || null;

/** Opens PO's inbox (or its Sent folder) for the time of `work`; null when
 * it cannot. */
export async function withInbox<T>(
  work: (inbox: Inbox) => Promise<T>,
  { folder = "inbox" }: { folder?: InboxFolder } = {},
): Promise<T | null> {
  const env = getServerEnv();
  const pass = env.EMAIL_SMTP_PASSWORD;
  if (!env.EMAIL_SMTP_USER || !pass) return null;
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: env.EMAIL_SMTP_USER, pass },
    logger: false,
  });
  try {
    await client.connect();
  } catch (error) {
    console.error(
      "withInbox connect:",
      error instanceof Error ? error.message.slice(0, 200) : "unknown",
    );
    return null;
  }
  const path =
    folder === "inbox"
      ? "INBOX"
      : (await client.list().catch(() => [])).find(
          (box) => box.specialUse === "\\Sent",
        )?.path;
  if (!path) {
    await client.logout().catch(() => undefined);
    return null;
  }
  const lock = await client.getMailboxLock(path);
  try {
    return await work({
      recent: async (days, max) => {
        const since = new Date(Date.now() - days * 86_400_000);
        const uids = (await client.search({ since }, { uid: true })) || [];
        const last = uids.slice(-max);
        if (last.length === 0) return [];
        const envelopes: InboxEnvelope[] = [];
        for await (const m of client.fetch(
          last,
          { uid: true, envelope: true },
          { uid: true },
        )) {
          const e = m.envelope;
          if (!e?.messageId) continue;
          envelopes.push({
            uid: m.uid,
            messageId: e.messageId,
            from: address(e.from?.[0]),
            to: [...(e.to ?? []), ...(e.cc ?? [])]
              .map(address)
              .filter((a): a is string => Boolean(a)),
            subject: e.subject ?? "",
            date: e.date ?? null,
          });
        }
        return envelopes;
      },
      read: async (uid) => {
        const m = await client.fetchOne(
          String(uid),
          { source: true },
          { uid: true },
        );
        if (!m || !m.source) return null;
        const parsed = await simpleParser(m.source);
        return {
          text: replyText(parsed.text ?? ""),
          attachments: parsed.attachments.map(
            (a) => a.filename ?? a.contentType,
          ),
          pdfs: parsed.attachments
            .filter(
              (a) =>
                (a.contentType === "application/pdf" ||
                  /\.pdf$/i.test(a.filename ?? "")) &&
                a.size > 0 &&
                a.size <= MAX_FILE,
            )
            .map((a) => ({
              name: a.filename || "Contrat signé.pdf",
              content: new Uint8Array(a.content),
            })),
          images: parsed.attachments
            .filter(
              (a) =>
                (a.contentType === "image/png" ||
                  a.contentType === "image/jpeg") &&
                a.size > 0 &&
                a.size <= MAX_FILE,
            )
            .map((a) => ({
              name:
                a.filename ||
                (a.contentType === "image/png" ? "Photo.png" : "Photo.jpg"),
              type: a.contentType,
              content: new Uint8Array(a.content),
            })),
          source: new Uint8Array(m.source),
        };
      },
      entries: async (uids) => {
        if (uids.length === 0) return [];
        const entries: InboxEntry[] = [];
        for await (const m of client.fetch(
          uids,
          {
            uid: true,
            bodyStructure: true,
            source: { maxLength: MAX_SOURCE },
          },
          { uid: true },
        )) {
          if (!m.source) continue;
          const parsed = await simpleParser(m.source).catch(() => null);
          const entry = parsed && entryOf(m.uid, parsed, m.bodyStructure);
          if (entry) entries.push(entry);
        }
        return entries;
      },
      attachment: async ({ uid, messageId }, part) => {
        const found =
          uid ??
          ((await client.search(
            { header: { "message-id": messageId } },
            { uid: true },
          )) || [])[0];
        if (!found) return null;
        const file = await client.download(String(found), part, {
          uid: true,
          maxBytes: MAX_ATTACHMENT,
        });
        const chunks: Buffer[] = [];
        for await (const chunk of file.content) chunks.push(chunk as Buffer);
        return {
          name: file.meta.filename ?? "Pièce jointe",
          type: file.meta.contentType || "application/octet-stream",
          content: new Uint8Array(Buffer.concat(chunks)),
        };
      },
    });
  } catch (error) {
    console.error(
      "withInbox:",
      error instanceof Error ? error.message.slice(0, 200) : "unknown",
    );
    return null;
  } finally {
    lock.release();
    await client.logout().catch(() => undefined);
  }
}

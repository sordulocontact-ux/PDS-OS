import "server-only";

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

import { replyText } from "@/lib/email/reply-text";
import { getServerEnv } from "@/lib/env";

/**
 * The single entry point for reading PO's mailbox (non-negotiable rule 2,
 * as lib/email/send.ts for sending): Gmail's IMAP with an app password.
 * Messages are fetched with BODY.PEEK: reading never marks them as read
 * in po@. Without the account or a password, `inboxEnabled()` is false and
 * nothing is read.
 */
export function inboxEnabled(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.EMAIL_SMTP_USER && (env.EMAIL_IMAP_PASSWORD ?? env.EMAIL_SMTP_PASSWORD),
  );
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
};

export type Inbox = {
  // The envelopes (sender, recipients, subject: no content) of the last
  // `days`, newest last, `max` at most.
  recent: (days: number, max: number) => Promise<InboxEnvelope[]>;
  // One message's text, once it is known to be a reply to file.
  read: (uid: number) => Promise<InboxMessage | null>;
};

const address = (a?: { address?: string }) =>
  a?.address?.trim().toLowerCase() || null;

/** Opens PO's inbox for the time of `work`; null when it cannot. */
export async function withInbox<T>(
  work: (inbox: Inbox) => Promise<T>,
): Promise<T | null> {
  const env = getServerEnv();
  const pass = env.EMAIL_IMAP_PASSWORD ?? env.EMAIL_SMTP_PASSWORD;
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
  const lock = await client.getMailboxLock("INBOX");
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

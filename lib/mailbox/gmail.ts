import "server-only";

import addressparser from "nodemailer/lib/addressparser";

import { htmlText } from "@/lib/email/inbox-entries";
import {
  getGmailMessage,
  listGmailIds,
  type GmailMessage,
  type GmailPart,
} from "@/lib/integrations/google-gmail";
import type { GmailAccount } from "@/lib/mailbox/gmail-accounts";
import { mailKinds } from "@/lib/mailbox/kinds";
import type { MailboxAttachment, MailboxMessage } from "@/lib/mailbox/types";
import { settleWithLimit } from "@/lib/utils/parallel";

// The newest messages of each account, and how many Gmail is asked at once.
export const GMAIL_LIMIT = 50;
const AT_ONCE = 10;

const header = (part: GmailPart | undefined, name: string) =>
  part?.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";

function people(value: string) {
  return addressparser(value, { flatten: true }).flatMap((a) => {
    const address = a.address?.trim().toLowerCase();
    return address ? [{ address, name: a.name?.trim() || null }] : [];
  });
}

// Gmail's snippet is HTML-escaped.
const unescape = (text: string) =>
  text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/** The files joined, by their part (a file has a name and an attachment). */
export function gmailAttachments(part: GmailPart | undefined) {
  const found: (MailboxAttachment & { attachmentId: string })[] = [];
  const walk = (node: GmailPart | undefined) => {
    if (!node) return;
    if (node.filename && node.partId && node.body?.attachmentId)
      found.push({
        part: node.partId,
        name: node.filename.slice(0, 200),
        type: node.mimeType ?? "",
        size: node.body.size ?? 0,
        attachmentId: node.body.attachmentId,
      });
    node.parts?.forEach(walk);
  };
  walk(part);
  return found;
}

function messageOf(account: GmailAccount, m: GmailMessage): MailboxMessage {
  const from = people(header(m.payload, "from"))[0] ?? null;
  const to = people(header(m.payload, "to"));
  const cc = people(header(m.payload, "cc"));
  const names: Record<string, string> = {};
  for (const p of [...to, ...cc]) if (p.name) names[p.address] = p.name;
  const subject = header(m.payload, "subject");
  // Gmail's attachment id changes at each reading: never kept.
  const attachments = gmailAttachments(m.payload).map(
    (f): MailboxAttachment => ({
      part: f.part,
      name: f.name,
      type: f.type,
      size: f.size,
    }),
  );
  const addresses = {
    to: to.map((p) => p.address),
    cc: cc.map((p) => p.address),
  };
  return {
    id: `gmail:${account.key}:${m.id}`,
    folder: m.labelIds?.includes("SENT") ? "sent" : "inbox",
    messageId: header(m.payload, "message-id"),
    threadIds: [],
    fromName: from?.name ?? null,
    fromAddress: from?.address ?? null,
    ...addresses,
    names,
    subject,
    sentAt: new Date(Number(m.internalDate ?? Date.now())).toISOString(),
    snippet: unescape(m.snippet ?? ""),
    attachments,
    kinds: mailKinds({ subject, attachments, ...addresses }),
    link: null,
    gmail: { account: account.key, email: account.email, id: m.id },
  };
}

/**
 * « Mon Gmail »: the newest mails of each of the member's own accounts, read
 * live from Gmail and merged, newest first. An account that does not answer
 * is named in `failed`; the others are still shown.
 */
// An account's list kept a minute by the server instance (« Tous » opens on
// every visit of Mails), by account and address: never another member's.
const KEPT_MS = 60_000;
const kept = new Map<string, { at: number; messages: MailboxMessage[] }>();

export async function listGmail(accounts: GmailAccount[]): Promise<{
  messages: MailboxMessage[];
  failed: string[];
}> {
  const failed: string[] = [];
  const lists = await Promise.all(
    accounts.map(async (account) => {
      const cacheKey = `${account.key}|${account.email}`;
      const hit = kept.get(cacheKey);
      if (hit && Date.now() - hit.at < KEPT_MS) return hit.messages;
      try {
        const token = await account.token();
        const ids = await listGmailIds(token, GMAIL_LIMIT);
        const heads = await settleWithLimit(ids, AT_ONCE, (id) =>
          getGmailMessage(token, id, "head"),
        );
        const messages = heads.flatMap((h) =>
          h.status === "fulfilled" ? [messageOf(account, h.value)] : [],
        );
        kept.set(cacheKey, { at: Date.now(), messages });
        return messages;
      } catch {
        failed.push(account.email);
        return [];
      }
    }),
  );
  const messages = lists
    .flat()
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  return { messages, failed };
}

// A text part's words, in its own charset.
function decode(part: GmailPart): string {
  const data = part.body?.data;
  if (!data) return "";
  const bytes = Buffer.from(data, "base64url");
  const charset =
    /charset="?([^";]+)"?/i.exec(header(part, "content-type"))?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset.trim().toLowerCase()).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** A message's whole text: its plain parts, else its HTML turned to text.
 * Never the HTML itself. */
export function gmailText(message: GmailMessage): string {
  const plain: string[] = [];
  const html: string[] = [];
  const walk = (node: GmailPart | undefined) => {
    if (!node) return;
    if (!node.filename) {
      if (node.mimeType === "text/plain") plain.push(decode(node));
      else if (node.mimeType === "text/html") html.push(decode(node));
    }
    node.parts?.forEach(walk);
  };
  walk(message.payload);
  const text = plain.join("\n\n").trim();
  return text || htmlText(html.join("\n"));
}

import "server-only";

import type { MessageStructureObject } from "imapflow";
import type { AddressObject, ParsedMail } from "mailparser";

/**
 * A whole message of PO's mailbox, as the page « Mails » keeps it
 * (lib/mailbox/sync.ts): who, to whom, the thread, its text and the files
 * joined (named, sized and placed by the body structure, never downloaded
 * here). Read by lib/email/inbox.ts, the single entry point of the box.
 */
export type InboxEntry = {
  uid: number;
  messageId: string;
  from: { name: string | null; address: string | null };
  // Lowercased addresses.
  to: string[];
  cc: string[];
  replyTo: string[];
  // Address → name, as written in the message.
  names: Record<string, string>;
  // In-Reply-To then References, without duplicates.
  thread: string[];
  subject: string;
  date: Date | null;
  // The whole text (the HTML turned to text when there is no text part).
  text: string;
  attachments: InboxAttachment[];
};

export type InboxAttachment = {
  // The body part, to read the file later (Inbox.attachment).
  part: string;
  name: string;
  type: string;
  size: number;
};

const lower = (a: string | undefined) => a?.trim().toLowerCase() || null;

function addressesOf(field: AddressObject | AddressObject[] | undefined) {
  const all = Array.isArray(field) ? field : field ? [field] : [];
  return all.flatMap((group) =>
    group.value.flatMap((a) => {
      const address = lower(a.address);
      return address ? [{ address, name: a.name?.trim() || null }] : [];
    }),
  );
}

const asList = (value: string | string[] | undefined): string[] =>
  Array.isArray(value) ? value : value ? value.split(/\s+/) : [];

// A text read from HTML when the message has no text part.
function htmlText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The entry of a message from its parsed head and text, and its structure. */
export function entryOf(
  uid: number,
  parsed: ParsedMail,
  structure: MessageStructureObject | undefined,
): InboxEntry | null {
  const messageId = parsed.messageId?.trim();
  if (!messageId) return null;
  const from = addressesOf(parsed.from)[0] ?? null;
  const to = addressesOf(parsed.to);
  const cc = addressesOf(parsed.cc);
  const names: Record<string, string> = {};
  for (const a of [...to, ...cc]) if (a.name) names[a.address] = a.name;
  const thread = [
    ...new Set([...asList(parsed.inReplyTo), ...asList(parsed.references)]),
  ].filter((id) => id && id !== messageId);
  const text =
    parsed.text?.trim() ||
    (typeof parsed.html === "string" ? htmlText(parsed.html) : "");
  return {
    uid,
    messageId,
    from: { name: from?.name ?? null, address: from?.address ?? null },
    to: to.map((a) => a.address),
    cc: cc.map((a) => a.address),
    replyTo: addressesOf(parsed.replyTo).map((a) => a.address),
    names,
    thread,
    subject: parsed.subject ?? "",
    date: parsed.date ?? null,
    text,
    attachments: structure ? attachmentsOf(structure) : [],
  };
}

/**
 * The files joined to a message, from its body structure: a part sent as an
 * attachment, or named without being an image shown in the HTML (a
 * signature's logo is not a file joined).
 */
export function attachmentsOf(node: MessageStructureObject): InboxAttachment[] {
  if (node.childNodes?.length)
    return node.childNodes.flatMap((child) => attachmentsOf(child));
  const name =
    node.dispositionParameters?.filename ?? node.parameters?.name ?? null;
  const attached = node.disposition === "attachment";
  const inlineImage =
    node.disposition === "inline" || (Boolean(node.id) && !attached);
  if (!node.part || !name || (!attached && inlineImage)) return [];
  return [
    {
      part: node.part,
      name: name.slice(0, 200),
      type: node.type.toLowerCase(),
      // The structure gives the encoded size: a base64 file is 3/4 of it.
      size: Math.round(
        (node.size ?? 0) *
          (node.encoding?.toLowerCase() === "base64" ? 0.75 : 1),
      ),
    },
  ];
}

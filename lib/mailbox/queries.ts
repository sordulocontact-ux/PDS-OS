import "server-only";

import type { Access } from "@/lib/auth/access";
import { mailKinds } from "@/lib/mailbox/kinds";
import { mailLinks } from "@/lib/mailbox/links";
import type {
  MailboxAttachment,
  MailboxFolder,
  MailboxMessage,
} from "@/lib/mailbox/types";
import { createClient } from "@/lib/supabase/server";

// Newest first; beyond it the page says the list is cut.
export const MAILBOX_LIMIT = 500;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The files joined, as the sync wrote them; anything else is left out. */
export function attachmentsOf(value: unknown): MailboxAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): MailboxAttachment[] =>
    isRecord(item) &&
    typeof item.part === "string" &&
    typeof item.name === "string"
      ? [
          {
            part: item.part,
            name: item.name,
            type: typeof item.type === "string" ? item.type : "",
            size: typeof item.size === "number" ? item.size : 0,
          },
        ]
      : [],
  );
}

function namesOf(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([address, name]) =>
      typeof name === "string" ? [[address, name]] : [],
    ),
  );
}

/**
 * The mails the viewer may read (RLS: their own, the direction's all), the
 * 500 most recent, without their whole text (read on opening). Their kind
 * and the link to what PDS OS filed them under are computed here.
 */
export async function listMailbox(access: Access): Promise<{
  messages: MailboxMessage[];
  truncated: boolean;
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mailbox_messages")
    .select(
      "id, folder, message_id, thread_ids, from_name, from_address, to_addresses, cc_addresses, names, subject, sent_at, snippet, attachments",
    )
    .order("sent_at", { ascending: false })
    .limit(MAILBOX_LIMIT + 1);
  if (error) {
    console.error("listMailbox:", error.message);
    return { messages: [], truncated: false, error: true };
  }
  const rows = (data ?? []).flatMap((row) =>
    row.folder === "inbox" || row.folder === "sent"
      ? [{ ...row, folder: row.folder as MailboxFolder }]
      : [],
  );
  const truncated = rows.length > MAILBOX_LIMIT;
  const shown = rows.slice(0, MAILBOX_LIMIT);
  const links = await mailLinks(
    shown.map((row) => ({ to: row.to_addresses, cc: row.cc_addresses })),
    access,
  );
  const messages = shown.map((row, index): MailboxMessage => {
    const attachments = attachmentsOf(row.attachments);
    const to = row.to_addresses;
    const cc = row.cc_addresses;
    return {
      id: row.id,
      folder: row.folder,
      messageId: row.message_id,
      threadIds: row.thread_ids,
      fromName: row.from_name,
      fromAddress: row.from_address,
      to,
      cc,
      names: namesOf(row.names),
      subject: row.subject,
      sentAt: row.sent_at,
      snippet: row.snippet,
      attachments,
      kinds: mailKinds({ subject: row.subject, attachments, to, cc }),
      link: links[index] ?? null,
    };
  });
  return { messages, truncated, error: false };
}

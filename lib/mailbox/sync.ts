import "server-only";

import { inboxEnabled, withInbox, type InboxFolder } from "@/lib/email/inbox";
import type { InboxEntry } from "@/lib/email/inbox-entries";
import { getServerEnv } from "@/lib/env";
import { ownersOf } from "@/lib/mailbox/owners";
import { loadMembers, loadOwnersContext } from "@/lib/mailbox/owners-context";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

// How far back each run looks (a message copied before is known by its
// Message-ID in its folder), how many envelopes it reads, and how many new
// messages it copies per folder: the delay is caught up in a few runs, and a
// run stays within the cron's 60 s.
const DAYS = 365;
const MAX_ENVELOPES = 2000;
const MAX_NEW = 30;
const FOLDERS: InboxFolder[] = ["inbox", "sent"];

/**
 * The page « Mails » (Sacha 23/11/2026): PO's Inbox and its Sent folder
 * copied in mailbox_messages (cron /api/cron/inbox, service role: no user
 * triggers it), each message once, never rewritten, with the members it
 * belongs to (lib/mailbox/owners.ts). The mailbox's organization is the
 * oldest one (a single one in production). A folder that fails never stops
 * the other. Nothing is read by the AI; the logs never carry a message's
 * content nor an address.
 */
export async function syncMailbox(): Promise<{ copied: number } | null> {
  if (!inboxEnabled()) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data: organization, error } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !organization) {
    if (error) console.error("syncMailbox organization:", error.message);
    return null;
  }
  const po = getServerEnv().EMAIL_SMTP_USER?.trim().toLowerCase() ?? null;
  const members = await loadMembers(supabase, organization.id, po);
  if (!members) return null;

  let copied = 0;
  let failed = 0;
  for (const folder of FOLDERS) {
    const done = await withInbox(
      async (inbox) => {
        const envelopes = (await inbox.recent(DAYS, MAX_ENVELOPES)).filter(
          (e) => e.messageId.length <= 300,
        );
        const known = await knownIds(
          supabase,
          organization.id,
          folder,
          envelopes.map((e) => e.messageId),
        );
        const uids = envelopes
          .filter((e) => !known.has(e.messageId))
          .slice(-MAX_NEW)
          .map((e) => e.uid);
        const entries = await inbox.entries(uids);
        return copy(supabase, organization.id, folder, members, entries);
      },
      { folder },
    ).catch((err: unknown) => {
      console.error(
        `syncMailbox ${folder}:`,
        err instanceof Error ? err.message.slice(0, 200) : "unknown",
      );
      return null;
    });
    if (done === null) failed += 1;
    else copied += done;
  }
  return failed === FOLDERS.length ? null : { copied };
}

/** Copies a folder's new messages, oldest first: a reply copied in the same
 * run finds the owners of the message it answers. */
async function copy(
  supabase: Admin,
  organizationId: string,
  folder: InboxFolder,
  members: Map<string, string>,
  entries: InboxEntry[],
): Promise<number> {
  if (entries.length === 0) return 0;
  const context = await loadOwnersContext(
    supabase,
    organizationId,
    members,
    entries,
  );
  const ordered = [...entries].sort(
    (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0),
  );
  let copied = 0;
  for (const entry of ordered) {
    if (entry.messageId.length > 300) continue;
    const owners = ownersOf(entry, folder, context);
    const { data, error } = await supabase
      .from("mailbox_messages")
      .upsert(rowOf(organizationId, folder, entry, owners), {
        onConflict: "organization_id,folder,message_id",
        ignoreDuplicates: true,
      })
      .select("id");
    if (error) {
      console.error(
        `syncMailbox ${folder} insert:`,
        error.message.slice(0, 200),
      );
      continue;
    }
    copied += data.length;
    context.threads.set(entry.messageId, owners);
  }
  return copied;
}

// Text Postgres keeps (no NUL), cut to `max` characters without splitting
// one in two.
function clip(text: string, max: number): string {
  const clean = text.replace(/\u0000/g, "");
  if (clean.length <= max) return clean;
  return Array.from(clean).slice(0, max).join("");
}

function rowOf(
  organizationId: string,
  folder: InboxFolder,
  entry: InboxEntry,
  owners: string[],
) {
  const fromName = entry.from.name ? clip(entry.from.name, 200) : null;
  const fromAddress = entry.from.address ? clip(entry.from.address, 320) : null;
  return {
    organization_id: organizationId,
    folder,
    message_id: entry.messageId,
    imap_uid: entry.uid,
    person_ids: owners,
    thread_ids: entry.thread.slice(0, 100),
    from_name: fromName,
    from_address: fromAddress,
    to_addresses: entry.to,
    cc_addresses: entry.cc,
    names: entry.names,
    subject: clip(entry.subject, 500),
    sent_at: (entry.date ?? new Date()).toISOString(),
    snippet: clip(entry.text.replace(/\s+/g, " ").trim(), 280),
    body_text: clip(entry.text, 100_000),
    attachments: entry.attachments,
  };
}

/** The Message-IDs already copied in a folder (asked in small batches). */
async function knownIds(
  supabase: Admin,
  organizationId: string,
  folder: InboxFolder,
  ids: string[],
): Promise<Set<string>> {
  const known = new Set<string>();
  for (let i = 0; i < ids.length; i += 40) {
    const { data, error } = await supabase
      .from("mailbox_messages")
      .select("message_id")
      .eq("organization_id", organizationId)
      .eq("folder", folder)
      .in("message_id", ids.slice(i, i + 40));
    if (error) throw new Error(`known ids: ${error.message.slice(0, 150)}`);
    for (const row of data) known.add(row.message_id);
  }
  return known;
}

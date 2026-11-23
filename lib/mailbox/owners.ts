import type { InboxFolder } from "@/lib/email/inbox";
import type { InboxEntry } from "@/lib/email/inbox-entries";

/**
 * Who a message of PO's mailbox belongs to (`person_ids` of
 * mailbox_messages), decided by code at the copy (lib/mailbox/sync.ts), never
 * by reading the message. Sacha, 23/11/2026: « tout le monde peut voir les
 * mails qu'il a reçus, la direction voit tout »: the direction reads every
 * message by its permission (read_mailbox), so it is never added here; a
 * message without owner is read by the direction only.
 *
 * - Sent (Gmail's Sent folder): the member who sent it from PDS OS (the first
 *   Reply-To is their address, lib/email/send.ts), and any member in From,
 *   To or Cc.
 * - Received: the member who sent it, any member in To or Cc, the people of
 *   the authorisation request, the deal or the contract of a po+aut-<id>@ /
 *   po+deal-<id>@ / po+ctr-<id>@
 *   address it was sent to, and the owners of the messages it answers (its
 *   thread).
 *
 * Pure: everything it needs is in the context (lib/mailbox/owners-context.ts).
 */
export type OwnersContext = {
  // A member's address (lowercased) → their person id: approved members of
  // the mailbox's organization, with an enabled account. PO's own address
  // is never one.
  members: Map<string, string>;
  // PO's address of a request or a deal (lowercased) → its people.
  tagged: Map<string, string[]>;
  // A Message-ID already copied → its owners.
  threads: Map<string, string[]>;
};

export type OwnedEntry = Pick<
  InboxEntry,
  "from" | "to" | "cc" | "replyTo" | "thread"
>;

export function ownersOf(
  entry: OwnedEntry,
  folder: InboxFolder,
  context: OwnersContext,
): string[] {
  const owners = new Set<string>();
  const add = (id: string | undefined) => {
    if (id) owners.add(id);
  };
  const member = (address: string | null | undefined) =>
    address ? context.members.get(address.trim().toLowerCase()) : undefined;
  const recipients = [...entry.to, ...entry.cc];

  add(member(entry.from.address));
  for (const address of recipients) add(member(address));

  if (folder === "sent") {
    add(member(entry.replyTo[0]));
    return [...owners];
  }

  for (const address of recipients)
    for (const id of context.tagged.get(address.trim().toLowerCase()) ?? [])
      add(id);
  for (const messageId of entry.thread)
    for (const id of context.threads.get(messageId) ?? []) add(id);
  return [...owners];
}

import "server-only";

import { dealOfAddress } from "@/lib/email/deal-memo-address";
import type { InboxEntry } from "@/lib/email/inbox-entries";
import { clearanceOfAddress } from "@/lib/email/reply-address";
import type { OwnersContext } from "@/lib/mailbox/owners";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

// What lib/mailbox/owners.ts decides from, read by the cron that copies the
// mailbox (lib/mailbox/sync.ts, service role).

const lower = (address: string | null | undefined) =>
  address?.trim().toLowerCase() || null;

/**
 * The approved members of the organization with an enabled account, by
 * address (their address in PDS OS, and the work address the direction
 * wrote in Équipe), as public.finance_proof_sender reads them. PO's own
 * address is never a member's. Null when it cannot be read.
 */
export async function loadMembers(
  supabase: Admin,
  organizationId: string,
  po: string | null,
): Promise<Map<string, string> | null> {
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("person_id, approved_account_id, google_work_email")
    .eq("organization_id", organizationId)
    .eq("status", "approved")
    .not("approved_account_id", "is", null);
  if (error) {
    console.error("syncMailbox members:", error.message.slice(0, 200));
    return null;
  }
  const accountIds = memberships.flatMap((m) => m.approved_account_id ?? []);
  const personIds = [...new Set(memberships.map((m) => m.person_id))];
  const [accounts, people] = await Promise.all([
    accountIds.length
      ? supabase
          .from("accounts")
          .select("id, person_id")
          .in("id", accountIds)
          .is("disabled_at", null)
      : null,
    personIds.length
      ? supabase.from("people").select("id, email").in("id", personIds)
      : null,
  ]);
  if (accounts?.error || people?.error) {
    console.error("syncMailbox members: accounts or people unreadable");
    return null;
  }
  const enabled = new Set(
    (accounts?.data ?? []).map((a) => `${a.id}:${a.person_id}`),
  );
  const emailOf = new Map(
    (people?.data ?? []).map((p) => [p.id, lower(p.email)]),
  );
  const members = new Map<string, string>();
  for (const m of memberships) {
    if (!enabled.has(`${m.approved_account_id}:${m.person_id}`)) continue;
    for (const address of [
      emailOf.get(m.person_id),
      lower(m.google_work_email),
    ])
      if (address && address !== po) members.set(address, m.person_id);
  }
  return members;
}

/**
 * The context of a batch of messages: the people of the requests and deals
 * whose PO address they were sent to, and the owners of the messages they
 * answer, already copied (sync.ts adds each message of the batch as it goes).
 */
export async function loadOwnersContext(
  supabase: Admin,
  organizationId: string,
  members: Map<string, string>,
  entries: InboxEntry[],
): Promise<OwnersContext> {
  const memberIds = new Set(members.values());
  const recipients = [
    ...new Set(entries.flatMap((e) => [...e.to, ...e.cc]).map((a) => lower(a))),
  ].filter((a): a is string => Boolean(a));
  const clearanceAt = new Map<string, string>();
  const dealAt = new Map<string, string>();
  for (const address of recipients) {
    const clearance = clearanceOfAddress(address);
    if (clearance) clearanceAt.set(address, clearance);
    const deal = dealOfAddress(address);
    if (deal) dealAt.set(address, deal);
  }
  const [people, threads] = await Promise.all([
    peopleOf(
      supabase,
      organizationId,
      [...clearanceAt.values()],
      [...dealAt.values()],
    ),
    threadOwners(
      supabase,
      organizationId,
      entries.flatMap((e) => e.thread),
    ),
  ]);
  const tagged = new Map<string, string[]>();
  for (const [address, id] of [...clearanceAt, ...dealAt]) {
    const ids = (people.get(id) ?? []).filter((p) => memberIds.has(p));
    if (ids.length) tagged.set(address, ids);
  }
  return { members, tagged, threads };
}

/**
 * The people of each request (its responsible, the owner of its project:
 * who public.receive_clearance_reply tells) and of each deal (its assignee,
 * the owner of its project: who reads it, public.deal_readable_by), by id.
 */
async function peopleOf(
  supabase: Admin,
  organizationId: string,
  clearanceIds: string[],
  dealIds: string[],
): Promise<Map<string, string[]>> {
  const [clearances, deals] = await Promise.all([
    clearanceIds.length
      ? supabase
          .from("legal_clearances")
          .select("id, responsible_person_id, project_id")
          .eq("organization_id", organizationId)
          .in("id", [...new Set(clearanceIds)])
      : null,
    dealIds.length
      ? supabase
          .from("deals")
          .select("id, assignee_person_id, project_id")
          .eq("organization_id", organizationId)
          .in("id", [...new Set(dealIds)])
      : null,
  ]);
  const rows = [
    ...(clearances?.data ?? []).map((c) => ({
      id: c.id,
      person: c.responsible_person_id,
      project: c.project_id,
    })),
    ...(deals?.data ?? []).map((d) => ({
      id: d.id,
      person: d.assignee_person_id,
      project: d.project_id,
    })),
  ];
  const projectIds = [
    ...new Set(rows.flatMap((r) => (r.project ? [r.project] : []))),
  ];
  const { data: projects } = projectIds.length
    ? await supabase
        .from("projects")
        .select("id, owner_person_id")
        .in("id", projectIds)
    : { data: [] as Array<{ id: string; owner_person_id: string | null }> };
  const ownerOf = new Map(
    (projects ?? []).map((p) => [p.id, p.owner_person_id]),
  );
  return new Map(
    rows.map((r) => [
      r.id,
      [r.person, r.project ? ownerOf.get(r.project) : null].filter(
        (p): p is string => Boolean(p),
      ),
    ]),
  );
}

/** The owners of the messages already copied, by Message-ID (in batches). */
async function threadOwners(
  supabase: Admin,
  organizationId: string,
  messageIds: string[],
): Promise<Map<string, string[]>> {
  const ids = [...new Set(messageIds)];
  const owners = new Map<string, string[]>();
  for (let i = 0; i < ids.length; i += 40) {
    const { data } = await supabase
      .from("mailbox_messages")
      .select("message_id, person_ids")
      .eq("organization_id", organizationId)
      .in("message_id", ids.slice(i, i + 40));
    for (const row of data ?? [])
      owners.set(row.message_id, [
        ...new Set([...(owners.get(row.message_id) ?? []), ...row.person_ids]),
      ]);
  }
  return owners;
}

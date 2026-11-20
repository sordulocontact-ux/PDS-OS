import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

// Who may send a deal its memo, and the memos already filed: read by the
// cron that files them (lib/email/deal-memo-inbox.ts, service role).

/** The addresses that may send a deal its memo → the deals they belong to:
 * the deal's people and counterpart (their address in the Réseau; a private
 * contact's is not read here, as for the authorisations), the sender of an
 * earlier memo of the deal. */
export async function dealsBySender(
  supabase: Admin,
  deals: Map<string, unknown>,
): Promise<Map<string, string[]>> {
  const bySender = new Map<string, string[]>();
  const ids = [...deals.keys()];
  if (ids.length === 0) return bySender;
  const add = (email: string | null | undefined, dealId: string) => {
    const key = email?.trim().toLowerCase();
    if (!key) return;
    const list = bySender.get(key) ?? [];
    if (!list.includes(dealId)) list.push(dealId);
    bySender.set(key, list);
  };
  const [{ data: links }, { data: counterparts }, { data: memos }] =
    await Promise.all([
      supabase
        .from("deal_contacts")
        .select("deal_id, contact_id")
        .in("deal_id", ids),
      supabase
        .from("deals")
        .select("id, counterpart_contact_id")
        .in("id", ids)
        .not("counterpart_contact_id", "is", null),
      supabase
        .from("deal_memos")
        .select("deal_id, email_from")
        .in("deal_id", ids)
        .not("email_from", "is", null),
    ]);
  const pairs = [
    ...(links ?? []).map((l) => [l.deal_id, l.contact_id] as const),
    ...(counterparts ?? []).flatMap((d) =>
      d.counterpart_contact_id
        ? [[d.id, d.counterpart_contact_id] as const]
        : [],
    ),
  ];
  const contactIds = [...new Set(pairs.map(([, c]) => c))];
  const { data: contacts } = contactIds.length
    ? await supabase
        .from("network_contacts")
        .select("id, email")
        .in("id", contactIds)
    : { data: [] as Array<{ id: string; email: string | null }> };
  const emailOf = new Map((contacts ?? []).map((c) => [c.id, c.email]));
  for (const [dealId, contactId] of pairs) add(emailOf.get(contactId), dealId);
  for (const m of memos ?? []) add(m.email_from, m.deal_id);
  return bySender;
}

/** The Message-IDs already filed (asked in small batches). */
export async function filedMemoIds(
  supabase: Admin,
  ids: string[],
): Promise<Set<string>> {
  const known = new Set<string>();
  for (let i = 0; i < ids.length; i += 40) {
    const { data } = await supabase
      .from("deal_memos")
      .select("email_message_id")
      .in("email_message_id", ids.slice(i, i + 40));
    for (const row of data ?? [])
      if (row.email_message_id) known.add(row.email_message_id);
  }
  return known;
}

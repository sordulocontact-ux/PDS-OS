import "server-only";

import type { Access } from "@/lib/auth/access";
import {
  searchGmailIds,
  getGmailMessage,
} from "@/lib/integrations/google-gmail";
import { gmailAttachments } from "@/lib/mailbox/gmail";
import { gmailAccounts } from "@/lib/mailbox/gmail-accounts";
import type { Deal } from "@/lib/deals/types";
import { withPrivateDetails } from "@/lib/network/private-details";
import { createClient } from "@/lib/supabase/server";

// A deal memo in the negotiator's own Gmail (Sacha 23/11/2026: the label
// writes to her, not to PO's address of the deal). Read live with her own
// accounts (gmailAccounts: her session, her opt-outs), never stored; the
// PDFs are copied into the deal only on her click (gmail-memo-actions.ts,
// file_deal_memo_from_mail). The search is built from the addresses the deal
// holds, never from a mail's content.

// Before the contract, as a memo sent to po@ (deal-memo-inbox.ts).
export const GMAIL_MEMO_STAGES = [
  "to_contact",
  "call_planned",
  "negotiation",
  "agreement",
];
const DAYS = 60;
const PER_ACCOUNT = 5;
const ACCOUNTS = 3;

export type GmailMemo = {
  account: string;
  messageId: string;
  // The Message-ID header: one memo per mail.
  key: string;
  from: string;
  subject: string | null;
  receivedAt: string;
  files: { part: string; name: string }[];
};

const isPdf = (file: { name: string; type: string }) =>
  file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

const header = (
  headers: { name: string; value: string }[] | undefined,
  name: string,
) => headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";

/** The addresses the deal's memo may come from: its contacts, its
 * counterpart, the participation's contact, the artist's managers. */
async function senders(deal: Deal): Promise<string[]> {
  const supabase = await createClient();
  const none = Promise.resolve({ data: null });
  const [links, participation, managers] = await Promise.all([
    supabase.from("deal_contacts").select("contact_id").eq("deal_id", deal.id),
    deal.participationId
      ? supabase
          .from("title_participations")
          .select("contact_id")
          .eq("id", deal.participationId)
          .maybeSingle()
      : none,
    deal.artistId
      ? supabase
          .from("artist_contacts")
          .select("contact_id, email")
          .eq("artist_id", deal.artistId)
          .eq("role", "manager")
      : none,
  ]);
  const ids = [
    ...(links.data ?? []).map((l) => l.contact_id),
    deal.counterpartId,
    participation.data?.contact_id ?? null,
    ...(managers.data ?? []).map((m) => m.contact_id),
  ].filter((id): id is string => !!id);
  const { data: contacts } = ids.length
    ? await supabase
        .from("network_contacts")
        .select("id, email, private_owner_person_id")
        .in("id", [...new Set(ids)])
    : { data: [] };
  const { rows } = await withPrivateDetails(supabase, contacts ?? []);
  return [
    ...new Set(
      [
        ...rows.map((c) => c.email),
        ...(managers.data ?? []).map((m) => m.email),
      ]
        .filter((e): e is string => !!e && /^[^@\s"()]+@[^@\s"()]+$/.test(e))
        .map((e) => e.trim().toLowerCase()),
    ),
  ].slice(0, 20);
}

/** The memos in the member's own Gmail from the deal's people, not filed
 * yet, newest first. Empty when there is nothing to look for. */
export async function findGmailMemos(
  access: Access,
  deal: Deal,
): Promise<GmailMemo[]> {
  if (!deal.canWrite || !GMAIL_MEMO_STAGES.includes(deal.stage)) return [];
  const from = await senders(deal);
  if (from.length === 0) return [];
  const { accounts } = await gmailAccounts(access);
  if (accounts.length === 0) return [];
  const q = `from:(${from.join(" OR ")}) has:attachment filename:pdf newer_than:${DAYS}d -in:spam -in:trash`;

  const found = (
    await Promise.all(
      accounts.slice(0, ACCOUNTS).map(async (account) => {
        try {
          const token = await account.token();
          const ids = await searchGmailIds(token, q, PER_ACCOUNT);
          const messages = await Promise.all(
            ids.map((id) => getGmailMessage(token, id, "head")),
          );
          return messages.flatMap((m): GmailMemo[] => {
            const files = gmailAttachments(m.payload).filter(isPdf);
            const key = header(m.payload?.headers, "message-id");
            if (files.length === 0 || !key) return [];
            return [
              {
                account: account.key,
                messageId: m.id,
                key,
                from: header(m.payload?.headers, "from"),
                subject: header(m.payload?.headers, "subject") || null,
                receivedAt: new Date(Number(m.internalDate ?? 0)).toISOString(),
                files: files.map((f) => ({ part: f.part, name: f.name })),
              },
            ];
          });
        } catch (error) {
          console.error("findGmailMemos:", account.key, error);
          return [];
        }
      }),
    )
  ).flat();
  if (found.length === 0) return [];

  // Already the deal's memo (filed from Gmail, or sent to po@ as well).
  const supabase = await createClient();
  const { data: filed } = await supabase
    .from("deal_memos")
    .select("email_message_id")
    .eq("deal_id", deal.id)
    .in(
      "email_message_id",
      found.map((m) => m.key.slice(0, 300)),
    );
  const known = new Set((filed ?? []).map((m) => m.email_message_id));
  const seen = new Set<string>();
  return found
    .filter((m) => {
      if (known.has(m.key.slice(0, 300)) || seen.has(m.key)) return false;
      seen.add(m.key);
      return true;
    })
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}

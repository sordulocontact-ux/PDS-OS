import "server-only";

import { randomUUID } from "node:crypto";

import { contractOfAddress } from "@/lib/email/contract-address";
import { dealOfAddress } from "@/lib/email/deal-memo-address";
import {
  inboxEnabled,
  withInbox,
  type InboxEnvelope,
  type InboxMessage,
} from "@/lib/email/inbox";
import { dealsBySender, filedMemoIds } from "@/lib/email/deal-memo-senders";
import { clearanceOfAddress } from "@/lib/email/reply-address";
import { getServerEnv } from "@/lib/env";
import { isProofsAddress } from "@/lib/finance/proof-address";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSearch } from "@/lib/utils/search";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

// How far back each run looks (a memo filed before is known by its
// Message-ID), how many messages and files it takes at most.
const DAYS = 14;
const MAX_MESSAGES = 300;
const MAX_FILES = 10;
// The bucket deal-files' limit (20 Mo).
const MAX_BYTES = 20 * 1024 * 1024;
const BUCKET = "deal-files";
// A deal whose memo may come from a known sender without PO's address of
// the deal: before the contract (a PDF sent while contracting is the
// contract, not a memo).
const BEFORE_CONTRACT = [
  "to_contact",
  "call_planned",
  "negotiation",
  "agreement",
];

type OpenDeal = {
  id: string;
  organizationId: string;
  stage: string;
  // The artist's and the counterpart's names, normalised: what a subject
  // names when one sender negotiates several deals.
  names: string[];
};

/**
 * The deal memos sent by e-mail (réunion avec Ibé du 18/11/2026: « la
 * maison de disques envoie un deal memo […] par mail »), filed in their deal
 * (cron /api/cron/inbox, service role: no user triggers it), « comme les
 * masters »: a draft memo with its PDFs and the e-mail's text, the
 * negotiator told. Which deal a message belongs to is decided by the code,
 * never by reading the memo:
 * 1. sent to PO's address of the deal (po+deal-<id>@…, the label wrote to
 *    it or the business manager forwarded it there);
 * 2. else, from the address of a contact of exactly one deal before its
 *    contract (the deal's people, its counterpart, the sender of an earlier
 *    memo);
 * 3. else, a sender of several: the deal whose artist or counterpart the
 *    subject or the text names, when only one does.
 * Only a message with a PDF joined is a memo; anything else stays in po@.
 * What the memo says is never read here (Ibé is to send an example).
 */
export async function fileEmailedDealMemos(): Promise<{
  filed: number;
} | null> {
  if (!inboxEnabled()) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;
  const deals = await openDeals(supabase);
  if (!deals) return null;
  const bySender = await dealsBySender(supabase, deals);
  const po = getServerEnv().EMAIL_SMTP_USER?.toLowerCase();

  return withInbox(async (inbox) => {
    const envelopes = await inbox.recent(DAYS, MAX_MESSAGES);
    const known = await filedMemoIds(
      supabase,
      envelopes.map((e) => e.messageId),
    );
    let filed = 0;
    for (const e of envelopes) {
      if (known.has(e.messageId) || !e.from || e.from === po) continue;
      // Another box's message (an authorisation's reply, a proof, a
      // contract signed and sent back).
      if (
        e.to.some(
          (a) =>
            clearanceOfAddress(a) || isProofsAddress(a) || contractOfAddress(a),
        )
      )
        continue;
      const tagged = e.to
        .map(dealOfAddress)
        .find((id): id is string => Boolean(id && deals.has(id)));
      const candidates = tagged
        ? [tagged]
        : (bySender.get(e.from) ?? []).filter((id) =>
            BEFORE_CONTRACT.includes(deals.get(id)?.stage ?? ""),
          );
      if (candidates.length === 0) continue;
      const message = await inbox.read(e.uid);
      if (!message || message.pdfs.length === 0) continue;
      const id =
        candidates.length === 1
          ? candidates[0]
          : named(candidates, deals, `${e.subject}\n${message.text}`);
      const deal = id ? deals.get(id) : null;
      if (deal && (await file(supabase, deal, e, message))) filed += 1;
    }
    return { filed };
  });
}

async function openDeals(
  supabase: Admin,
): Promise<Map<string, OpenDeal> | null> {
  const { data, error } = await supabase
    .from("deals")
    .select(
      "id, organization_id, stage, artist:artists!deals_artist_same_org(name), counterpart:network_contacts!deals_counterpart_same_org(name)",
    )
    .not("stage", "in", "(signed,abandoned)");
  if (error) {
    console.error("fileEmailedDealMemos deals:", error.message);
    return null;
  }
  return new Map(
    data.map((d) => [
      d.id,
      {
        id: d.id,
        organizationId: d.organization_id,
        stage: d.stage,
        names: [d.artist?.name, d.counterpart?.name]
          .map((n) => normalizeSearch(n ?? ""))
          .filter((n) => n.length >= 3),
      },
    ]),
  );
}

/** The only deal whose artist or counterpart the message names, else null. */
function named(
  candidates: string[],
  deals: Map<string, OpenDeal>,
  text: string,
): string | null {
  const said = normalizeSearch(text);
  const found = candidates.filter((id) =>
    (deals.get(id)?.names ?? []).some((name) => said.includes(name)),
  );
  return found.length === 1 ? found[0] : null;
}

async function file(
  supabase: Admin,
  deal: OpenDeal,
  e: InboxEnvelope,
  message: InboxMessage,
): Promise<boolean> {
  const pdfs = message.pdfs
    .filter((f) => f.content.byteLength <= MAX_BYTES)
    .slice(0, MAX_FILES);
  if (pdfs.length === 0) return false;
  const files = pdfs.map((f) => ({
    path: `${deal.organizationId}/${deal.id}/${randomUUID()}.pdf`,
    name: f.name.slice(0, 255).trim() || "Deal memo.pdf",
    size: f.content.byteLength,
    content: f.content,
  }));
  const uploaded: string[] = [];
  for (const f of files) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(f.path, f.content, { contentType: "application/pdf" });
    if (error) {
      console.error("fileEmailedDealMemos upload:", error.message);
      await remove(supabase, uploaded);
      return false;
    }
    uploaded.push(f.path);
  }
  const { data, error } = await supabase.rpc("receive_deal_memo", {
    p_deal_id: deal.id,
    p_message_id: e.messageId,
    p_from: e.from ?? "",
    p_subject: e.subject,
    p_text: message.text,
    p_received_at: (e.date ?? new Date()).toISOString(),
    p_files: files.map(({ path, name, size }) => ({ path, name, size })),
  });
  if (error) console.error("fileEmailedDealMemos:", error.message);
  if (error || !data) {
    await remove(supabase, uploaded);
    return false;
  }
  return true;
}

async function remove(supabase: Admin, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.error("fileEmailedDealMemos remove:", error.message);
}

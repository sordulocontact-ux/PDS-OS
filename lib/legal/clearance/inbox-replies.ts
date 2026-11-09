import "server-only";

import { withInbox, inboxEnabled, type Inbox } from "@/lib/email/inbox";
import { clearanceOfAddress } from "@/lib/email/reply-address";
import { fileSignedCopy } from "@/lib/legal/clearance/signed-by-email";
import { getServerEnv } from "@/lib/env";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSearch } from "@/lib/utils/search";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

// How far back each run looks: a run missed for a few days loses nothing
// (an e-mail filed before is recognised by its Message-ID).
const DAYS = 14;
const MAX_MESSAGES = 300;
// The requests a holder may answer by a new e-mail (not a reply to ours):
// asked, not closed.
const ASKED = [
  "contacted",
  "waiting_external",
  "negotiating",
  "agreement_reached",
  "document_pending",
  "signed",
  "refused",
  "action_required",
];

type OpenRequest = { id: string; work: string; asked: boolean };

/**
 * The rights holders' replies to the authorisation requests, filed in each
 * request's journal (cron /api/cron/inbox, service role). Which request a
 * message answers is decided by the code, never by reading it first:
 * 1. sent to PO's address of a request (po+aut-<id>@…: they clicked
 *    « Répondre »);
 * 2. else, from the address of a holder of exactly one request asked;
 * 3. else, a holder of several: the one whose work the subject or the text
 *    names, when only one does.
 * Anything else stays in po@, untouched (pasted by hand in « Négocier »).
 * A PDF joined to a reply while the contract is out for signature is kept
 * in the contract as its signed copy (`fileSignedCopy`).
 */
export async function fileClearanceReplies(): Promise<{
  filed: number;
  left: number;
} | null> {
  if (!inboxEnabled()) return null;
  const supabase = createAdminClient();
  if (!supabase) return null;
  const requests = await openRequests(supabase);
  if (!requests) return null;
  const byHolder = await requestsByHolder(supabase, requests);
  const po = getServerEnv().EMAIL_SMTP_USER?.toLowerCase();

  return withInbox(async (inbox) => {
    const envelopes = await inbox.recent(DAYS, MAX_MESSAGES);
    const known = await filedIds(
      supabase,
      envelopes.map((e) => e.messageId),
    );
    let filed = 0;
    let left = 0;
    for (const e of envelopes) {
      if (known.has(e.messageId) || !e.from || e.from === po) continue;
      const tagged = e.to
        .map(clearanceOfAddress)
        .find((id): id is string => Boolean(id && requests.has(id)));
      const candidates = tagged
        ? [tagged]
        : (byHolder.get(e.from) ?? []).filter((id) => requests.get(id)?.asked);
      if (candidates.length === 0) continue;
      const message = await inbox.read(e.uid);
      if (!message) continue;
      const id =
        candidates.length === 1
          ? candidates[0]
          : namedWork(candidates, requests, `${e.subject}\n${message.text}`);
      if (!id) {
        left += 1;
        continue;
      }
      if (await file(supabase, id, e, message)) filed += 1;
    }
    return { filed, left };
  });
}

async function openRequests(
  supabase: Admin,
): Promise<Map<string, OpenRequest> | null> {
  const { data, error } = await supabase
    .from("legal_clearances")
    .select("id, work, status")
    .not("status", "in", "(cleared,abandoned)");
  if (error) {
    console.error("fileClearanceReplies requests:", error.message);
    return null;
  }
  return new Map(
    data.map((c) => [
      c.id,
      { id: c.id, work: c.work, asked: ASKED.includes(c.status) },
    ]),
  );
}

/** The holders' addresses in the Réseau → the requests they hold a right of. */
async function requestsByHolder(
  supabase: Admin,
  requests: Map<string, OpenRequest>,
): Promise<Map<string, string[]>> {
  const byHolder = new Map<string, string[]>();
  const ids = [...requests.keys()];
  if (ids.length === 0) return byHolder;
  const { data: holders } = await supabase
    .from("legal_clearance_rightsholders")
    .select("clearance_id, contact_id, email")
    .in("clearance_id", ids);
  const contactIds = [
    ...new Set((holders ?? []).flatMap((h) => h.contact_id ?? [])),
  ];
  const { data: contacts } =
    contactIds.length > 0
      ? await supabase
          .from("network_contacts")
          .select("id, email")
          .in("id", contactIds)
      : { data: [] as Array<{ id: string; email: string | null }> };
  const emailOf = new Map(
    (contacts ?? []).flatMap((c) =>
      c.email ? [[c.id, c.email.trim().toLowerCase()] as const] : [],
    ),
  );
  for (const h of holders ?? []) {
    // The fiche's address, else the one a name-only holder was e-mailed to.
    const email = h.contact_id
      ? emailOf.get(h.contact_id)
      : h.email?.trim().toLowerCase();
    if (!email) continue;
    const list = byHolder.get(email) ?? [];
    if (!list.includes(h.clearance_id)) list.push(h.clearance_id);
    byHolder.set(email, list);
  }
  return byHolder;
}

/** The Message-IDs already in a journal (asked in small batches). */
async function filedIds(supabase: Admin, ids: string[]): Promise<Set<string>> {
  const known = new Set<string>();
  for (let i = 0; i < ids.length; i += 40) {
    const { data } = await supabase
      .from("legal_clearance_communications")
      .select("external_id")
      .in("external_id", ids.slice(i, i + 40));
    for (const row of data ?? [])
      if (row.external_id) known.add(row.external_id);
  }
  return known;
}

/** The only request whose work the message names, else null. */
function namedWork(
  candidates: string[],
  requests: Map<string, OpenRequest>,
  text: string,
): string | null {
  const said = normalizeSearch(text);
  const named = candidates.filter((id) => {
    const work = normalizeSearch(requests.get(id)?.work ?? "");
    return work.length >= 3 && said.includes(work);
  });
  return named.length === 1 ? named[0] : null;
}

async function file(
  supabase: Admin,
  clearanceId: string,
  e: Awaited<ReturnType<Inbox["recent"]>>[number],
  message: NonNullable<Awaited<ReturnType<Inbox["read"]>>>,
): Promise<boolean> {
  const t = legalClearance.flow;
  const body = [
    message.text || t.replyEmpty,
    ...(message.attachments.length > 0
      ? ["", t.replyAttachments(message.attachments.join(", "))]
      : []),
  ].join("\n");
  const { data, error } = await supabase.rpc("receive_clearance_reply", {
    p_clearance_id: clearanceId,
    p_external_id: e.messageId,
    p_from: e.from ?? "",
    p_body: body,
    p_received_at: (e.date ?? new Date()).toISOString(),
  });
  if (error) {
    console.error("fileClearanceReplies file:", error.message);
    return false;
  }
  if (data !== true) return false;
  // Filed for the first time: a signed contract joined goes to the contract.
  if (e.from)
    await fileSignedCopy(supabase, clearanceId, e.from, e.date, message);
  return true;
}

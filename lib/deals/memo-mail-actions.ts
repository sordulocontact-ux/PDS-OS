"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { loadDealLoop } from "@/lib/deals/memo-mail-queries";
import { memoAttachments } from "@/lib/deals/memo-mail-send";
import { loadDealMemos } from "@/lib/deals/memo-queries";
import { runMemoGesture, uuid } from "@/lib/deals/memo-run";
import { loadDeal } from "@/lib/deals/queries";
import { dealMemoAddress } from "@/lib/email/deal-memo-address";
import { emailMessage } from "@/lib/email/link-email";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { deals } from "@/lib/i18n/fr/deals";
import { schedulePendingPushes } from "@/lib/notifications/push";
import type { WriteResult } from "@/lib/utils/write-result";

// The deal memo's circuit by e-mail (réunion avec Ibé du 18/11/2026): shown
// to the direction, changes asked with a reason, the validated agreement
// sent back from po@, the people in the loop. Each gesture is one SQL
// function with the user's session; the database decides who may.

const t = dealMemos;
const invalid = { ok: false, error: deals.errors.invalid } as const;

/** After a gesture that notifies (the direction, the negotiator, the loop). */
async function told(result: WriteResult): Promise<WriteResult> {
  if (result.ok) await schedulePendingPushes();
  return result;
}

/** « Montrer à la direction ». */
export async function submitDealMemo(
  dealId: string,
  memoId: string,
): Promise<WriteResult> {
  if (!uuid.safeParse(memoId).success) return invalid;
  return told(
    await runMemoGesture(dealId, "submitDealMemo", t.submitted, (s) =>
      s.rpc("submit_deal_memo", { p_memo_id: memoId }),
    ),
  );
}

/** « Demander des modifications » (the direction), a written reason. */
export async function requestDealMemoChanges(
  dealId: string,
  memoId: string,
  reason: string,
): Promise<WriteResult> {
  if (!uuid.safeParse(memoId).success) return invalid;
  const text = reason.trim();
  if (!text || text.length > 2000)
    return { ok: false, error: t.errors.reason_required };
  return told(
    await runMemoGesture(
      dealId,
      "requestDealMemoChanges",
      t.changes.done,
      (s) =>
        s.rpc("request_deal_memo_changes", {
          p_memo_id: memoId,
          p_reason: text,
        }),
    ),
  );
}

const sendInput = z.object({
  byEmail: z.boolean(),
  to: z.object({ name: z.string().trim().max(200), email: z.string().trim() }),
  subject: z.string().trim().min(1).max(300),
  message: z.string().trim().min(1).max(2000),
});

/**
 * « Renvoyer l'accord validé »: the validated memo leaves by PDS OS (from
 * po@, in the member's name, replies to them), its PDFs joined — the ones
 * received, else the memo made in PDS OS —, one e-mail to the label or the
 * brand and one copy to each contact in the loop with an address; then
 * the sending is kept (to whom: the proof). `byEmail: false`: sent another
 * way, only noted.
 */
export async function sendDealMemo(
  dealId: string,
  memoId: string,
  input: z.input<typeof sendInput>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const p = sendInput.safeParse(input);
  if (!uuid.safeParse(dealId).success || !uuid.safeParse(memoId).success)
    return invalid;
  if (!p.success) return { ok: false, error: t.send.invalid };
  const record = (to: string) =>
    runMemoGesture(dealId, "sendDealMemo", t.send.done, (s) =>
      s.rpc("record_deal_memo_sent", { p_memo_id: memoId, p_sent_to: to }),
    );
  if (!p.data.byEmail) return told(await record(""));

  const deal = await loadDeal(access, dealId).catch(() => null);
  const memo = deal
    ? (await loadDealMemos(deal.id, deal.kind)).find((m) => m.id === memoId)
    : null;
  if (!deal || !memo) return { ok: false, error: t.errors.memo_not_found };
  if (memo.status !== "validated")
    return { ok: false, error: t.errors.memo_not_validated };
  if (memo.sent) return { ok: false, error: t.errors.memo_sent };

  const attachments = await memoAttachments(memo, deal);
  if (!attachments) return { ok: false, error: t.send.noAttachment };
  const mail = {
    subject: p.data.subject,
    text: p.data.message,
    attachments,
  };
  const to = {
    name: p.data.to.name || p.data.to.email,
    email: p.data.to.email,
  };
  const outcome = await emailMessage({ ...mail, to });
  if (outcome !== "sent")
    return outcome === "failed"
      ? { ok: false, error: t.send.failed }
      : { ok: false, error: t.send.disabled };

  const copies: string[] = [];
  const missed: string[] = [];
  for (const entry of await loadDealLoop(dealId)) {
    if (entry.kind !== "contact") continue;
    const sent = entry.email
      ? await emailMessage({
          ...mail,
          to: { name: entry.name, email: entry.email },
        })
      : "disabled";
    if (sent === "sent") copies.push(`${entry.name} (${entry.email})`);
    else missed.push(entry.name);
  }
  const proof = [
    `${to.name === to.email ? to.email : `${to.name} (${to.email})`}`,
    ...(copies.length ? [t.send.copiesProof(copies.join(", "))] : []),
  ].join(" · ");
  const result = await told(await record(proof));
  if (!result.ok) {
    // Left, but not kept: said, never hidden.
    console.error("sendDealMemo: sent, not recorded");
    return result;
  }
  return missed.length
    ? { ok: true, notice: t.send.missed(missed.join(", ")) }
    : result;
}

const loopInput = z.union([
  z.object({ contactId: z.uuid() }),
  z.object({ personId: z.uuid() }),
]);

/** « Mettre dans la boucle »: a contact of the Réseau, or a member. */
export async function addDealLoop(
  dealId: string,
  input: z.input<typeof loopInput>,
): Promise<WriteResult> {
  const p = loopInput.safeParse(input);
  if (!p.success) return { ok: false, error: t.loop.required };
  return runMemoGesture(dealId, "addDealLoop", t.loop.added, (s) =>
    s.rpc("add_deal_loop", {
      p_deal_id: dealId,
      ...("contactId" in p.data
        ? { p_contact_id: p.data.contactId }
        : { p_person_id: p.data.personId }),
    }),
  );
}

/** « Retirer » someone from the loop. */
export async function removeDealLoop(
  dealId: string,
  loopId: string,
): Promise<WriteResult> {
  if (!uuid.safeParse(loopId).success) return invalid;
  return runMemoGesture(dealId, "removeDealLoop", t.loop.removed, (s) =>
    s.rpc("remove_deal_loop", { p_loop_id: loopId }),
  );
}

/**
 * « Demander la correction » (Sacha 22/11/2026): the changes the direction
 * asked on a memo received go to the label or the brand from PDS OS (po@, in
 * the member's name), the deal's address in reply-to so their next version
 * comes back into the deal by itself; then the sending is kept (to whom).
 * `byEmail: false`: asked another way, only noted.
 */
export async function sendMemoCorrection(
  dealId: string,
  memoId: string,
  input: z.input<typeof sendInput>,
): Promise<WriteResult> {
  await requireApproved();
  const p = sendInput.safeParse(input);
  if (!uuid.safeParse(dealId).success || !uuid.safeParse(memoId).success)
    return invalid;
  if (!p.success) return { ok: false, error: t.send.invalid };
  const record = (to: string) =>
    runMemoGesture(dealId, "sendMemoCorrection", t.correction.done, (s) =>
      s.rpc("record_deal_memo_correction_sent", {
        p_memo_id: memoId,
        p_sent_to: to,
      }),
    );
  if (!p.data.byEmail) return told(await record(""));
  const to = {
    name: p.data.to.name || p.data.to.email,
    email: p.data.to.email,
  };
  const address = dealMemoAddress(dealId);
  const outcome = await emailMessage({
    to,
    subject: p.data.subject,
    text: p.data.message,
    replyTo: address ? [address] : undefined,
  });
  if (outcome !== "sent")
    return outcome === "failed"
      ? { ok: false, error: t.send.failed }
      : { ok: false, error: t.send.disabled };
  return told(
    await record(to.name === to.email ? to.email : `${to.name} (${to.email})`),
  );
}

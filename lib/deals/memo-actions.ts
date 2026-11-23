"use server";

import { z } from "zod";

import { runMemoGesture, uuid } from "@/lib/deals/memo-run";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { deals } from "@/lib/i18n/fr/deals";
import { schedulePendingPushes } from "@/lib/notifications/push";
import type { WriteResult } from "@/lib/utils/write-result";

// The deal memo and the contract (BIZ 7): one gesture = one SQL function,
// with the user's session; the database decides who may.

const t = dealMemos;
const id = uuid;
const run = runMemoGesture;

/** « Nouveau deal memo »: a draft photo of the terms now. */
export async function createDealMemo(dealId: string): Promise<WriteResult> {
  return run(dealId, "createDealMemo", t.created, (s) =>
    s.rpc("create_deal_memo", { p_deal_id: dealId }),
  );
}

/** « Déposer le memo reçu »: the PDF the label sent, already uploaded in
 * the deal's folder of deal-files, becomes the deal's memo (Sacha
 * 23/11/2026). */
export async function depositDealMemo(
  dealId: string,
  path: string,
  fileName: string,
): Promise<WriteResult> {
  if (!path.startsWith(`${path.split("/")[0]}/${dealId}/`))
    return { ok: false, error: deals.errors.invalid };
  return run(dealId, "depositDealMemo", t.deposit.done, (s) =>
    s.rpc("deposit_deal_memo", {
      p_deal_id: dealId,
      p_path: path,
      p_name: fileName.slice(0, 255),
    }),
  );
}

/** « Valider le deal memo » (the direction). */
export async function validateDealMemo(
  dealId: string,
  memoId: string,
): Promise<WriteResult> {
  if (!id.safeParse(memoId).success)
    return { ok: false, error: deals.errors.invalid };
  const result = await run(dealId, "validateDealMemo", t.validated, (s) =>
    s.rpc("validate_deal_memo", { p_memo_id: memoId }),
  );
  // The negotiator and the loop are told (deal_memo_validated).
  if (result.ok) await schedulePendingPushes();
  return result;
}

/** « Lier un contrat » (null: the link is taken off). */
export async function linkDealContract(
  dealId: string,
  contractId: string | null,
): Promise<WriteResult> {
  if (contractId !== null && !id.safeParse(contractId).success)
    return { ok: false, error: deals.errors.invalid };
  return run(
    dealId,
    "linkDealContract",
    contractId ? t.contract.linked : t.contract.unlinked,
    (s) =>
      s.rpc("link_deal_contract", {
        p_deal_id: dealId,
        p_contract_id: contractId,
      }),
  );
}

const checkInput = z
  .object({
    memoId: z.uuid(),
    key: z.string().min(1).max(40),
    verdict: z.enum(["conform", "different"]),
    note: z
      .string()
      .trim()
      .max(1000)
      .nullish()
      .transform((v) => v || null),
  })
  .refine((v) => v.verdict === "conform" || v.note !== null);

/** « Conforme » / « Différent » (with what the contract says). */
export async function setDealMemoCheck(
  dealId: string,
  input: z.input<typeof checkInput>,
): Promise<WriteResult> {
  const p = checkInput.safeParse(input);
  if (!p.success) return { ok: false, error: t.compare.noteRequired };
  return run(dealId, "setDealMemoCheck", t.compare.saved, (s) =>
    s.rpc("set_deal_memo_check", {
      p_memo_id: p.data.memoId,
      p_term_key: p.data.key,
      p_verdict: p.data.verdict,
      p_note: p.data.note ?? undefined,
    }),
  );
}

"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { cents, optionalText, refresh } from "@/lib/finance/write-helpers";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = financeReceipts;
const e = t.errors;

// Finance › Justificatifs (lot 6): what a person does with a proof. The
// rules are in SQL (20261115600101_finance_receipts.sql): who writes
// Finance, a checked reading before attaching, a spend without a proof,
// never a second spend.

const REFUSALS: [string, string][] = [
  ["proof_unchecked", e.unchecked],
  ["proof_attached", e.attached],
  ["proof_dismissed", e.dismissed],
  ["line_has_proof", e.hasProof],
  ["line_not_found", e.noLine],
  ["line_refused", e.refused],
];

function failure(error: { code?: string; message: string }): WriteResult {
  if (error.code === "42501" || error.message.includes("row-level security"))
    return { ok: false, error: e.forbidden };
  const known = REFUSALS.find(([code]) => error.message.includes(code));
  if (known) return { ok: false, error: known[1] };
  console.error("proof gesture:", error.message);
  return { ok: false, error: e.generic };
}

const checkInput = z.object({
  id: z.uuid(),
  vendor: optionalText(200),
  amount: z.string(),
  vat: z.string(),
  issuedOn: z.iso.date(),
  reference: optionalText(120),
});

/** « Confirmer les valeurs »: the values as a person read them on the
 * document (a photo, a value not found in the text). The database stamps
 * who checked; what the reading gave stays in read_values. */
export async function checkProof(
  input: z.input<typeof checkInput>,
): Promise<WriteResult> {
  await requireApproved();
  const p = checkInput.safeParse(input);
  const amount = p.success ? cents(p.data.amount) : null;
  const vat = p.success ? cents(p.data.vat) : null;
  if (!p.success || amount === null || amount <= 0)
    return { ok: false, error: e.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_proofs")
    .update({
      vendor: p.data.vendor,
      amount_cents: amount,
      vat_cents: vat,
      issued_on: p.data.issuedOn,
      reference: p.data.reference,
      checked_at: new Date().toISOString(),
    })
    .eq("id", p.data.id)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { ok: false, error: e.forbidden };
  refresh();
  return { ok: true, done: t.check.saved };
}

/** « Rattacher »: the file becomes the spend's proof (attach_finance_proof),
 * never a second spend. */
export async function attachProof(
  proofId: string,
  lineId: string,
): Promise<WriteResult> {
  await requireApproved();
  if (
    !z.uuid().safeParse(proofId).success ||
    !z.uuid().safeParse(lineId).success
  )
    return { ok: false, error: e.invalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("attach_finance_proof", {
    p_proof: proofId,
    p_line: lineId,
  });
  if (error) return failure(error);
  refresh();
  return { ok: true, done: t.attached };
}

/** After « Créer la dépense »: the spend just saved with this file as its
 * proof is found by the file, then the proof is marked attached to it. */
export async function attachToCreatedSpend(
  proofId: string,
): Promise<WriteResult> {
  await requireApproved();
  if (!z.uuid().safeParse(proofId).success)
    return { ok: false, error: e.invalid };
  const supabase = await createClient();
  const { data: proof } = await supabase
    .from("finance_proofs")
    .select("file_path")
    .eq("id", proofId)
    .maybeSingle();
  if (!proof) return { ok: false, error: e.invalid };
  const { data: line } = await supabase
    .from("budget_lines")
    .select("id")
    .eq("proof_path", proof.file_path)
    .maybeSingle();
  // Saved on a project or an artist: its proof stays to attach by hand
  // (the new spend is then proposed first).
  if (!line) return { ok: true };
  return attachProof(proofId, line.id);
}

/** « Écarter » (not a proof, a duplicate…), with why; « Remettre à
 * traiter » undoes it. */
export async function dismissProof(
  id: string,
  reason: string | null,
): Promise<WriteResult> {
  await requireApproved();
  const why = reason?.trim().slice(0, 300) || null;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: e.invalid };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_proofs")
    .update(
      why
        ? { dismissed_at: new Date().toISOString(), dismiss_reason: why }
        : { dismissed_at: null, dismiss_reason: null },
    )
    .eq("id", id)
    .select("id");
  if (error) return failure(error);
  if (!data?.length) return { ok: false, error: e.forbidden };
  refresh();
  return { ok: true, done: why ? t.dismiss.saved : t.dismiss.restored };
}

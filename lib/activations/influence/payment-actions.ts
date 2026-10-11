"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
  textOrNull,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const STATUSES = [
  "not_requested",
  "document_expected",
  "to_validate",
  "ready_to_pay",
  "paid_declared",
  "paid_verified",
  "dispute",
] as const;

const paymentSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  targetId: z.uuid(),
  paymentId: z.uuid().nullable(),
  amount: z.number().nonnegative().max(1e9),
  currency: z.string().regex(/^[A-Z]{3}$/),
  beneficiary: z.string().max(200),
  documents: z.string().max(1000),
  invoiceFileId: z.uuid().nullable(),
  dueOn: z.union([z.iso.date(), z.literal("")]),
});

/** The obligation followed (amount, beneficiary, pieces, due date) ; no bank
 * details, no transfer. */
export async function savePayment(
  input: z.input<typeof paymentSchema>,
): Promise<WriteResult> {
  const access = await requireApproved();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success)
    return invalid(fr.activationInfluence.errors.amountInvalid);
  const v = parsed.data;
  const values = {
    amount: v.amount,
    currency: v.currency,
    beneficiary: textOrNull(v.beneficiary),
    documents_requested: textOrNull(v.documents),
    invoice_file_id: v.invoiceFileId,
    due_on: textOrNull(v.dueOn),
  };
  const supabase = await createClient();
  const { error } = v.paymentId
    ? await supabase
        .from("influence_payments")
        .update(values)
        .eq("id", v.paymentId)
    : await supabase.from("influence_payments").insert({
        ...values,
        target_id: v.targetId,
        organization_id: access.organizationId ?? "",
        project_id: v.projectId,
        activation_id: v.activationId,
      });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const advanceSchema = z.object({
  projectId: z.uuid(),
  paymentId: z.uuid(),
  status: z.enum(STATUSES),
  note: z.string().max(1000),
  proofFileId: z.uuid().nullable(),
});

/** Moves the administrative status, checked by the database (agreement for
 * « Bon à payer », proof for « Payé vérifié »). */
export async function advancePayment(
  input: z.input<typeof advanceSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = advanceSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("advance_influence_payment", {
    p_payment_id: v.paymentId,
    p_status: v.status,
    p_note: v.note,
    p_proof_file_id: v.proofFileId,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

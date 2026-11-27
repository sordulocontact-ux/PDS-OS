"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const schema = z.object({
  contractId: z.uuid(),
  signedOn: z.iso.date(),
});

/**
 * « Déjà signé » of « Déposer un contrat » (Sacha 26/11/2026): the contract
 * just created, its signed file filed, enters as signed on that day
 * (record_signed_contract checks the rights, the state, the file and that
 * the day is not in the future).
 */
export async function recordSignedContract(input: {
  contractId: string;
  signedOn: string;
}): Promise<WriteResult> {
  const t = fr.contracts.errors;
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.signedOn };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_signed_contract", {
    p_contract_id: parsed.data.contractId,
    p_signed_on: parsed.data.signedOn,
  });
  if (error) {
    const message = error.message ?? "";
    if (message.includes("contract_signed_on_invalid"))
      return { ok: false, error: t.signedOn };
    if (message.includes("contract_wrong_status"))
      return { ok: false, error: t.status };
    if (message.includes("contract_proof_missing"))
      return { ok: false, error: fr.legalContracts.document.proofMissing };
    if (error.code === "42501") return { ok: false, error: t.forbidden };
    console.error("recordSignedContract:", message);
    return { ok: false, error: t.failed };
  }
  revalidatePath(routes.contracts);
  revalidatePath(routes.contract(parsed.data.contractId));
  return { ok: true };
}

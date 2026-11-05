"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { legalOutcome } from "@/lib/legal/outcome";
import { CLAUSES } from "@/lib/legal/contracts/clauses";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const schema = z.object({
  projectId: catalogIdSchema,
  contractId: catalogIdSchema,
  clause: z.enum(CLAUSES),
  body: z.string().min(1).max(200_000),
  reason: z.string().trim().min(1).max(2000),
});

/**
 * « Modifier une clause » in the person's step (proto « Projet complet »):
 * a new version of the document with the clause it changes and why
 * (revise_contract_clause: rights, state and journal checked there; an
 * approved contract goes back to draft).
 */
export async function reviseContractClause(
  input: z.input<typeof schema>,
): Promise<WriteResult> {
  const t = fr.legalDocuments.contract;
  const parsed = schema.safeParse(input);
  await requireApproved();
  if (!parsed.success) return { ok: false, error: t.missingWhy };
  return legalOutcome(parsed.data.projectId, t.created, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("revise_contract_clause", {
      p_contract_id: parsed.data.contractId,
      p_clause: parsed.data.clause,
      p_body: parsed.data.body,
      p_reason: parsed.data.reason,
    });
    if (error) {
      const message = error.message ?? "";
      if (message.includes("contract_body_unchanged"))
        return { ok: false, error: t.missingText };
      if (message.includes("contract_wrong_status"))
        return { ok: false, error: fr.contracts.errors.status };
      if (error.code === "42501")
        return { ok: false, error: fr.auth.errors.forbidden };
      console.error("reviseContractClause:", message);
      return { ok: false, error: fr.legalContracts.agreements.errors.failed };
    }
    revalidatePath(routes.projectLegal(parsed.data.projectId), "layout");
    revalidatePath(routes.contract(parsed.data.contractId));
    return { ok: true, done: t.created };
  });
}

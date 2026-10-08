"use server";

import { z } from "zod";

import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { run } from "@/lib/legal/clearance/run";
import { RIGHT_KINDS } from "@/lib/legal/clearance/matrix";

// Conditions received and the contract of each right (ticket Juridique 05).

const ids = { projectId: catalogIdSchema, clearanceId: catalogIdSchema };

export async function linkContract(
  projectId: string,
  clearanceId: string,
  right: string,
  contractId: string,
) {
  const p = z
    .object({ ...ids, right: z.enum(RIGHT_KINDS), contractId: catalogIdSchema })
    .safeParse({ projectId, clearanceId, right, contractId });
  if (!p.success)
    return { ok: false as const, error: fr.auth.errors.forbidden };
  return run(p.data.projectId, (s) =>
    s.rpc("link_clearance_contract", {
      p_clearance_id: p.data.clearanceId,
      p_right: p.data.right,
      p_contract_id: p.data.contractId,
    }),
  );
}

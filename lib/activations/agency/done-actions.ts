"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
} from "@/lib/activations/result";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.activationJourney;

/**
 * « Déclarer réalisée avec une réserve » (recette of 23/10, MKT-ACT-001): an
 * agency campaign whose lines are not all settled is declared done, and what
 * remains becomes a reserve of the bilan with who follows it and when
 * (`declare_activation_done_with_reserve`, 20261026400101).
 */
export async function declareDoneWithReserve(input: {
  projectId: string;
  activationId: string;
  reason: string;
  personId: string;
  dueOn: string;
}): Promise<WriteResult> {
  await requireApproved();
  const v = z
    .object({
      projectId: z.uuid(),
      activationId: z.uuid(),
      reason: z.string().trim().min(1).max(1000),
      personId: z.uuid(),
      dueOn: z.iso.date(),
    })
    .safeParse(input);
  if (!v.success) return invalid();
  const { projectId, activationId, reason, personId, dueOn } = v.data;
  return withOutcome(projectId, ["marketing"], t.done.declared, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc(
      "declare_activation_done_with_reserve",
      {
        p_activation_id: activationId,
        p_reason: reason,
        p_person_id: personId,
        p_due_on: dueOn,
      },
    );
    if (error) return activationFailure(error);
    return activationDone(projectId);
  });
}

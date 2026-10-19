"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { withOutcome } from "@/lib/journey/outcome";
import { prepDone, prepFailure } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const schema = z.object({
  projectId: z.uuid(),
  proposalId: z.uuid(),
  name: z.string().max(200),
});

/**
 * « Retenir » a director proposed by the company (whoever organises the
 * Production): he holds « Réalisation » and gets his private link, shown
 * once (`token`); the other proposals are « Non retenu ».
 */
export async function retainDirector(
  input: z.input<typeof schema>,
): Promise<WriteResult & { token?: string }> {
  await requireApproved();
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: fr.productionPrep.errors.invalid };
  const p = parsed.data;
  let token: string | undefined;
  const result = await withOutcome(
    p.projectId,
    ["marketing"],
    fr.productionDirector.done(p.name),
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("retain_production_director", {
        p_proposal_id: p.proposalId,
      });
      if (error || !data) return prepFailure(error ?? {});
      token = data;
      return prepDone(p.projectId);
    },
  );
  return result.ok ? { ...result, token } : result;
}

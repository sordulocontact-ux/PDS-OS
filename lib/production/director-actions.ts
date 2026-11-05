"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { projectTitleOf } from "@/lib/email/outcome";
import { emailProviderLink } from "@/lib/email/provider-email";
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
): Promise<
  WriteResult & { token?: string; emailed?: "sent" | "failed" | "disabled" }
> {
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
  if (!result.ok || !token) return result;
  // The retained director's Réseau contact (made or found by the database):
  // PDS OS e-mails him his space when it can, else the link is shown once.
  const supabase = await createClient();
  const { data: retained } = await supabase
    .from("production_director_proposals")
    .select("contact_id")
    .eq("id", p.proposalId)
    .maybeSingle();
  const e = fr.productionDirector.email;
  const emailed = retained?.contact_id
    ? await emailProviderLink({
        contactId: retained.contact_id,
        token,
        subject: e.subject(await projectTitleOf(p.projectId)),
        body: e.body,
        open: e.open,
      })
    : "disabled";
  return {
    ...result,
    token,
    emailed,
    ...(emailed === "failed" ? { notice: e.failed } : {}),
  };
}

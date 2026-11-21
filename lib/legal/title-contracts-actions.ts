"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { legalOutcome } from "@/lib/legal/outcome";
import { TITLE_CONTRACT_KINDS } from "@/lib/legal/title-contracts-rules";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// « Confirmer les contrats nécessaires » of a collective's title (§ 3.4 of
// Ibé's 18/11/2026): the kinds ticked are recorded by
// confirm_title_contract_needs, which decides the rights again (manage_legal
// on a project seen), a collective's live title only. Nothing is drafted
// from it: drafting stays one contract per person.

const confirmSchema = z.object({
  projectId: catalogIdSchema,
  titleId: catalogIdSchema,
  kinds: z.array(z.enum(TITLE_CONTRACT_KINDS)).max(TITLE_CONTRACT_KINDS.length),
});

function errorOf(message: string): string {
  const t = fr.legalDemarches.titleContracts.errors;
  if (message.includes("title_abandoned")) return t.abandoned;
  if (message.includes("invalid_kinds")) return t.invalid;
  if (message.includes("forbidden") || message.includes("title_not_found"))
    return fr.auth.errors.forbidden;
  if (message.includes("not_collective")) return fr.auth.errors.forbidden;
  return t.failed;
}

export async function confirmTitleContractNeeds(
  input: z.input<typeof confirmSchema>,
): Promise<WriteResult> {
  const parsed = confirmSchema.safeParse(input);
  const access = await requireApproved();
  if (!parsed.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const { projectId, titleId, kinds } = parsed.data;
  return legalOutcome(
    projectId,
    fr.legalDemarches.titleContracts.done,
    async (): Promise<WriteResult> => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("confirm_title_contract_needs", {
        p_title_id: titleId,
        p_kinds: [...new Set(kinds)],
      });
      if (error) {
        console.error("confirmTitleContractNeeds:", error.message);
        return { ok: false, error: errorOf(error.message) };
      }
      revalidatePath(routes.projectLegal(projectId), "layout");
      return { ok: true };
    },
  );
}

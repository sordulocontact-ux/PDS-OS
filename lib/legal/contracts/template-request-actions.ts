"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { DecisionOutcomeKind } from "@/components/ui/decision-panel";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { legalOutcome } from "@/lib/legal/outcome";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

/**
 * The direction's decision on a template asked from the Plan d'action
 * (proto « Projet complet »): « Valider le modèle » puts it in the library,
 * « Refuser le modèle » says what is wrong — signed, it goes back to the one
 * who made it. The rights and the order are checked by
 * set_contract_template_status (validate permission).
 */
export async function decideTemplateRequest(
  projectId: string,
  templateId: string,
  kind: DecisionOutcomeKind,
  comment: string,
): Promise<WriteResult> {
  const t = fr.legalDocuments.template;
  const ids = z
    .object({ projectId: catalogIdSchema, templateId: catalogIdSchema })
    .safeParse({ projectId, templateId });
  await requireApproved();
  if (!ids.success || (kind !== "approve" && kind !== "refuse"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const reason = comment.trim().slice(0, 2000);
  if (kind === "refuse" && !reason)
    return { ok: false, error: t.refuseMissing };
  return legalOutcome(
    ids.data.projectId,
    kind === "approve" ? t.validated : t.refused,
    async () => {
      const supabase = await createClient();
      const { error } = await supabase.rpc("set_contract_template_status", {
        p_template_id: ids.data.templateId,
        p_status: kind === "approve" ? "validated" : "retired",
        p_reason: kind === "approve" ? null : reason,
      });
      if (error) {
        if (error.code === "42501")
          return { ok: false, error: fr.legalContracts.templates.forbidden };
        console.error("decideTemplateRequest:", error.message);
        return { ok: false, error: fr.legalContracts.templates.failed };
      }
      await schedulePendingPushes();
      revalidatePath(routes.projectLegal(ids.data.projectId), "layout");
      revalidatePath(routes.contractTemplates);
      revalidatePath(routes.contracts);
      return { ok: true, done: kind === "approve" ? t.validated : t.refused };
    },
  );
}

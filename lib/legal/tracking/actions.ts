"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  projectId: catalogIdSchema,
  itemId: catalogIdSchema,
  responsibleId: catalogIdSchema.nullable(),
  dueOn: z.iso.date().nullable(),
});

export type DelegateResult = { ok: true } | { ok: false; error: string };

/**
 * Delegates an action or moves its due date (« Délégation ou escalade
 * explicite lorsque le responsable change », Juridique 07): written by
 * update_legal_plan_item, which keeps the change in the plan's journal.
 */
export async function delegateLegalPlanItem(
  input: z.infer<typeof inputSchema>,
): Promise<DelegateResult> {
  const t = fr.legal.tracking.errors;
  const parsed = inputSchema.safeParse(input);
  const access = await requireApproved();
  if (!parsed.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const { projectId, itemId, responsibleId, dueOn } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_legal_plan_item", {
    p_item_id: itemId,
    p_responsible_person_id: responsibleId,
    p_due_on: dueOn,
  });
  if (error) {
    console.error("delegateLegalPlanItem:", error.message);
    return {
      ok: false,
      error: error.message.includes("legal_plan_responsible_invalid")
        ? t.responsible
        : t.failed,
    };
  }
  // The task moves with the action (a trigger); its new person is told.
  await schedulePendingPushes();
  revalidatePath(routes.projectLegal(projectId), "layout");
  revalidatePath(routes.projectWork(projectId));
  return { ok: true };
}

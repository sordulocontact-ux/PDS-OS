"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { TITLE_SCOPES } from "@/lib/projects/title-scope-rules";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const input = z
  .object({
    projectId: z.uuid(),
    deliverableId: z.uuid().nullable(),
    activationId: z.uuid().nullable(),
    scope: z.enum(TITLE_SCOPES),
    titleIds: z.array(z.uuid()).max(100),
  })
  .refine((v) => (v.deliverableId === null) !== (v.activationId === null));

/** « Titres visés » of a marketing action of a collective (lot 10): the
 * database decides who (the project's owner) and checks the titles. */
export async function setMarketingTitleScope(
  value: z.input<typeof input>,
): Promise<WriteResult> {
  await requireApproved();
  const t = fr.projectTitles.scope.errors;
  const parsed = input.safeParse(value);
  if (!parsed.success) return { ok: false, error: t.failed };
  const v = parsed.data;
  if (v.scope === "titles" && v.titleIds.length === 0)
    return { ok: false, error: t.titlesRequired };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_marketing_title_scope", {
    p_scope: v.scope,
    ...(v.scope === "titles" ? { p_title_ids: v.titleIds } : {}),
    ...(v.deliverableId ? { p_strategy_deliverable_id: v.deliverableId } : {}),
    ...(v.activationId ? { p_activation_id: v.activationId } : {}),
  });
  if (error) {
    if (error.code === "42501")
      return { ok: false, error: fr.auth.errors.forbidden };
    if (error.message.includes("titles_required"))
      return { ok: false, error: t.titlesRequired };
    if (error.message.includes("title_abandoned"))
      return { ok: false, error: t.abandoned };
    if (error.message.includes("title_not_found"))
      return { ok: false, error: t.titleNotFound };
    console.error("setMarketingTitleScope:", error.message);
    return { ok: false, error: t.failed };
  }
  revalidatePath(routes.project(v.projectId), "layout");
  return { ok: true };
}

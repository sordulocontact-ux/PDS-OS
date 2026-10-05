"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { proposeLegalPlan } from "@/lib/legal/plan/queries";
import { getProject } from "@/lib/projects/queries";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

const choicesSchema = z
  .array(
    z.object({
      key: z.string().min(1).max(120),
      include: z.boolean(),
      responsibleId: catalogIdSchema.nullable(),
      dueOn: z.iso.date().nullable(),
    }),
  )
  .max(200);

export type LaunchResult = { ok: true } | { ok: false; error: string };

/**
 * Launches the plan the person confirmed (« Confirmation du plan avant
 * lancement », Juridique 07). The items are rebuilt here from the dossier,
 * never taken from the browser: only the person's choices are (keep an item
 * or not, its responsible, its due date). An item left out no longer holds
 * the others back.
 */
export async function launchLegalPlan(
  projectId: string,
  choices: z.infer<typeof choicesSchema>,
): Promise<LaunchResult> {
  const t = fr.legal.plan.errors;
  const id = catalogIdSchema.safeParse(projectId);
  const parsed = choicesSchema.safeParse(choices);
  const access = await requireApproved();
  if (!id.success || !parsed.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const project = await getProject(id.data);
  if (!project) return { ok: false, error: fr.auth.errors.forbidden };

  const chosen = new Map(parsed.data.map((c) => [c.key, c]));
  const proposal = await proposeLegalPlan(project, access);
  const kept = proposal.filter((item) => chosen.get(item.key)?.include ?? true);
  const keys = new Set(kept.map((item) => item.key));
  const items = kept.map((item) => {
    const dependsOn = item.dependsOn.filter((key) => keys.has(key));
    const freed = item.status === "blocked" && dependsOn.length === 0;
    const choice = chosen.get(item.key);
    return {
      key: item.key,
      kind: item.kind,
      master_id: item.masterId,
      label: item.label,
      detail: item.detail,
      why: item.why,
      status: freed ? "action_now" : item.status,
      depends_on: dependsOn,
      responsible_person_id: choice?.responsibleId ?? null,
      due_on: choice?.dueOn ?? null,
    };
  });

  // An action to start now becomes a task, and a task needs a date: its
  // own, else the project's.
  const undated = items.filter(
    (item) =>
      item.status === "action_now" &&
      item.responsible_person_id &&
      !item.due_on &&
      !project.dueDate,
  );
  if (undated.length > 0)
    return {
      ok: false,
      error: t.dueMissing(undated.map((item) => item.label).join(", ")),
    };

  const supabase = await createClient();
  const { error } = await supabase.rpc("launch_legal_plan", {
    p_project_id: id.data,
    p_items: items,
  });
  if (error) {
    console.error("launchLegalPlan:", error.message);
    if (error.message.includes("legal_intake_not_confirmed"))
      return { ok: false, error: t.notConfirmed };
    if (error.message.includes("legal_plan_already_launched"))
      return { ok: false, error: t.already };
    return { ok: false, error: t.failed };
  }
  // The tasks' people are notified by a trigger; the pushes leave now.
  await schedulePendingPushes();
  revalidatePath(routes.projectLegal(id.data), "layout");
  revalidatePath(routes.projectWork(id.data));
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { planItemPayload } from "@/lib/legal/plan/payload";
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
  const items = kept.map((item) =>
    planItemPayload(item, keys, chosen.get(item.key)),
  );

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

/**
 * « Ajouter au plan »: the actions the dossier asks for now that the plan
 * does not hold (a person or a title added since the launch), each with its
 * task, given to the project's owner, on the project's date.
 */
export async function addLegalPlanItems(
  projectId: string,
): Promise<LaunchResult> {
  const id = catalogIdSchema.safeParse(projectId);
  const access = await requireApproved();
  if (!id.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const project = await getProject(id.data);
  if (!project) return { ok: false, error: fr.auth.errors.forbidden };

  const supabase = await createClient();
  const [proposal, existing, people] = await Promise.all([
    proposeLegalPlan(project, access),
    supabase
      .from("legal_plan_items")
      .select("item_key")
      .eq("project_id", project.id),
    access.organizationId
      ? supabase.rpc("list_legal_people", {
          p_organization_id: access.organizationId,
        })
      : Promise.resolve({ data: [], error: null }),
  ]);
  const known = new Set((existing.data ?? []).map((row) => row.item_key));
  const fresh = proposal.filter((item) => !known.has(item.key));
  if (fresh.length === 0) return { ok: true };
  const owner = (people.data ?? []).some(
    (p) => p.person_id === project.ownerPersonId,
  )
    ? project.ownerPersonId
    : null;
  const keys = new Set([...known, ...fresh.map((item) => item.key)]);
  const { error } = await supabase.rpc("add_legal_plan_items", {
    p_project_id: project.id,
    p_items: fresh.map((item) =>
      planItemPayload(item, keys, {
        responsibleId: owner,
        dueOn: project.dueDate,
      }),
    ),
  });
  if (error) {
    console.error("addLegalPlanItems:", error.message);
    return { ok: false, error: fr.legal.tracking.added.failed };
  }
  await schedulePendingPushes();
  revalidatePath(routes.projectLegal(project.id), "layout");
  revalidatePath(routes.projectWork(project.id));
  return { ok: true };
}

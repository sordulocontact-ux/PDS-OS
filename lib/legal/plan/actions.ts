"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { loadAgreements } from "@/lib/legal/contracts/queries";
import { todayInParis } from "@/lib/insights/dates";
import { planDueDates } from "@/lib/legal/plan/due-dates";
import { planItemPayload } from "@/lib/legal/plan/payload";
import { proposeLegalPlan } from "@/lib/legal/plan/queries";
import { getProject } from "@/lib/projects/queries";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { legalOutcome } from "@/lib/legal/outcome";
import type { WriteResult } from "@/lib/utils/write-result";
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

export type LaunchResult = WriteResult;

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

  // The contracts to provide for are confirmed first (proto « Projet
  // complet », lot 9 J3): a person with a contact and no decision blocks.
  const agreements = await loadAgreements(project, access);
  if (
    agreements.rows.some(
      (r) => r.contactId && !r.contract && r.state === "unmapped",
    )
  )
    return {
      ok: false,
      error: fr.legalContracts.agreements.plan.launchFirst,
    };

  const chosen = new Map(parsed.data.map((c) => [c.key, c]));
  const proposal = await proposeLegalPlan(project, access);
  const kept = proposal.filter((item) => chosen.get(item.key)?.include ?? true);
  const keys = new Set(kept.map((item) => item.key));
  const items = kept.map((item) =>
    planItemPayload(item, keys, chosen.get(item.key)),
  );

  // Said after the gesture: who acts now, what opened (rule 7).
  return legalOutcome(id.data, fr.legalJourney.done.launched, async () => {
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
    // What was removed is remembered: never « apparu depuis le lancement »
    // nor re-created by « Ajouter au plan » (UX test of 09/10/2026).
    const dismissed = proposal
      .filter((item) => !keys.has(item.key))
      .map((item) => item.key);
    if (dismissed.length > 0) {
      const { error: dismissError } = await supabase.rpc(
        "dismiss_legal_plan_keys",
        { p_project_id: id.data, p_keys: dismissed },
      );
      if (dismissError)
        console.error("launchLegalPlan dismissed:", dismissError.message);
    }
    // The tasks' people are notified by a trigger; the pushes leave now.
    await schedulePendingPushes();
    revalidatePath(routes.projectLegal(id.data), "layout");
    revalidatePath(routes.projectWork(id.data));
    return { ok: true };
  });
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
  const [proposal, existing, plan, people] = await Promise.all([
    proposeLegalPlan(project, access),
    supabase
      .from("legal_plan_items")
      .select("item_key, due_on")
      .eq("project_id", project.id),
    supabase
      .from("legal_plans")
      .select("dismissed_keys")
      .eq("project_id", project.id)
      .maybeSingle(),
    access.organizationId
      ? supabase.rpc("list_legal_people", {
          p_organization_id: access.organizationId,
        })
      : Promise.resolve({ data: [], error: null }),
  ]);
  // In the plan, or removed from it by a person: never added again.
  const known = new Set([
    ...(existing.data ?? []).map((row) => row.item_key),
    ...(plan.data?.dismissed_keys ?? []),
  ]);
  const fresh = proposal.filter((item) => !known.has(item.key));
  if (fresh.length === 0) return { ok: true };
  const owner = (people.data ?? []).some(
    (p) => p.person_id === project.ownerPersonId,
  )
    ? project.ownerPersonId
    : null;
  const keys = new Set([...known, ...fresh.map((item) => item.key)]);
  const dues = planDueDates(
    fresh,
    project.dueDate,
    todayInParis(),
    new Map((existing.data ?? []).map((row) => [row.item_key, row.due_on])),
  );
  const { error } = await supabase.rpc("add_legal_plan_items", {
    p_project_id: project.id,
    p_items: fresh.map((item) =>
      planItemPayload(item, keys, {
        responsibleId: owner,
        dueOn: dues.get(item.key) ?? null,
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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import {
  fail,
  fromDatabaseError,
  ok,
  type ActionResult,
} from "@/lib/framing/result";
import { fr } from "@/lib/i18n/fr";
import { PLAN_COLUMNS, proposePlan } from "@/lib/plan/propose";
import { createClient } from "@/lib/supabase/server";

// « Modifier le plan » then « Lancer le plan » (ticket § 9): the browser
// only sends the person's choices (column, kept or removed, owner) by item
// key; the plan itself is proposed again here, so nothing is launched that
// the code did not propose.

const choice = z.object({
  key: z.string().min(1).max(40),
  column: z.enum(PLAN_COLUMNS),
  removed: z.boolean(),
  ownerPersonId: z.uuid().nullable(),
});

export async function launchPlan(
  projectId: string,
  choices: z.input<typeof choice>[],
): Promise<ActionResult> {
  const p = z
    .object({ projectId: z.uuid(), choices: z.array(choice).max(40) })
    .safeParse({ projectId, choices });
  if (!p.success) return fail("invalid_input");
  const access = await requireApproved();
  const knowledge = await loadFramingKnowledge(projectId, access);
  if (!knowledge) return fail("not_found");
  const byKey = new Map(p.data.choices.map((c) => [c.key, c]));
  const items = proposePlan(knowledge).flatMap((item) => {
    const chosen = byKey.get(item.key);
    if (chosen?.removed) return [];
    // A note stays a note; a workflow may move between the three others.
    const column =
      item.workflow === null
        ? "anticipate"
        : chosen && chosen.column !== "anticipate"
          ? chosen.column
          : item.column;
    return [
      {
        column,
        workflow: item.workflow ?? "",
        title: item.title,
        why: item.why,
        ownerPersonId:
          item.workflow === null
            ? ""
            : (chosen?.ownerPersonId ?? item.ownerPersonId ?? ""),
      },
    ];
  });
  if (items.length === 0) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("launch_project_plan", {
    p_project_id: projectId,
    p_items: items,
  });
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}

/**
 * « Lancer maintenant »: a workflow the plan left in Ensuite, or one left out
 * of it (removed before the launch, or never proposed), which is added in
 * Focus with its title and reason written here, never by the browser.
 */
export async function launchPlanWorkflow(
  projectId: string,
  workflow: string,
): Promise<ActionResult> {
  const p = z
    .object({
      projectId: z.uuid(),
      workflow: z.enum(["strategy", "master", "legal"]),
    })
    .safeParse({ projectId, workflow });
  if (!p.success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const t = fr.framingIntel.plan;
  const { error } = await supabase.rpc("launch_plan_workflow", {
    p_project_id: projectId,
    p_workflow: p.data.workflow,
    p_title: t.workflows[p.data.workflow],
    p_why: t.why.addedLater,
  });
  if (error) return fromDatabaseError(error);
  revalidatePath(routes.project(projectId), "layout");
  return ok;
}

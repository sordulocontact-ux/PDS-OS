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
import { PLAN_COLUMNS, PLAN_WORKFLOWS, proposePlan } from "@/lib/plan/propose";
import { createClient } from "@/lib/supabase/server";

// « Modifier le plan » then « Lancer le plan » (ticket § 9, PROJ-UX-07): the
// browser sends the person's choices (column, kept or removed, pilot,
// executor, due date, dependencies, order) by item key, plus the steps they
// added; the plan itself is proposed again here, so no workflow is launched
// that the code did not propose.

const date = z.iso.date().nullable();
const depends = z.array(z.enum(PLAN_WORKFLOWS)).max(PLAN_WORKFLOWS.length);
const choice = z.object({
  key: z.string().min(1).max(40),
  column: z.enum(PLAN_COLUMNS),
  removed: z.boolean(),
  ownerPersonId: z.uuid().nullable(),
  executorPersonId: z.uuid().nullable(),
  dueDate: date,
  dependsOn: depends,
  order: z.number().int().min(0).max(100),
});
const added = choice.extend({
  title: z.string().trim().min(1).max(200),
});

export async function launchPlan(
  projectId: string,
  choices: z.input<typeof choice>[],
  addedSteps: z.input<typeof added>[] = [],
): Promise<ActionResult> {
  const p = z
    .object({
      projectId: z.uuid(),
      choices: z.array(choice).max(40),
      added: z.array(added).max(20),
    })
    .safeParse({ projectId, choices, added: addedSteps });
  if (!p.success) return fail("invalid_input");
  const access = await requireApproved();
  const knowledge = await loadFramingKnowledge(projectId, access);
  if (!knowledge) return fail("not_found");
  const byKey = new Map(p.data.choices.map((c) => [c.key, c]));
  const proposed = proposePlan(knowledge).flatMap((item, index) => {
    const chosen = byKey.get(item.key);
    if (chosen?.removed) return [];
    // A note stays a note; a workflow may move between the three others.
    const column =
      item.workflow === null
        ? "anticipate"
        : chosen && chosen.column !== "anticipate"
          ? chosen.column
          : item.column;
    const isWorkflow = item.workflow !== null;
    return [
      {
        order: chosen?.order ?? index,
        column,
        workflow: item.workflow ?? "",
        title: item.title,
        why: item.why,
        ownerPersonId: isWorkflow
          ? (chosen?.ownerPersonId ?? item.ownerPersonId ?? "")
          : "",
        executorPersonId: isWorkflow ? (chosen?.executorPersonId ?? "") : "",
        dueDate: isWorkflow
          ? ((chosen ? chosen.dueDate : item.dueDate) ?? "")
          : "",
        dependsOn: isWorkflow
          ? (chosen?.dependsOn ?? item.dependsOn).filter(
              (w) => w !== item.workflow,
            )
          : [],
      },
    ];
  });
  // The steps a person added: no workflow, so nothing is launched by them.
  const extra = p.data.added
    .filter((a) => !a.removed)
    .map((a) => ({
      order: a.order,
      column: a.column,
      workflow: "",
      title: a.title,
      why: "",
      ownerPersonId: a.ownerPersonId ?? "",
      executorPersonId: a.executorPersonId ?? "",
      dueDate: a.dueDate ?? "",
      dependsOn: a.dependsOn,
    }));
  const items = [...proposed, ...extra]
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      column: item.column,
      workflow: item.workflow,
      title: item.title,
      why: item.why,
      ownerPersonId: item.ownerPersonId,
      executorPersonId: item.executorPersonId,
      dueDate: item.dueDate,
      dependsOn: item.dependsOn,
    }));
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

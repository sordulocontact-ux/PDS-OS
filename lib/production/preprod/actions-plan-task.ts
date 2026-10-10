"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

import {
  forbidden,
  invalid,
  nextPosition,
  preprodFailure,
  sheetOrg,
} from "./result";

// From the technical call to the plan, and from the plan to Travail
// (parcours 7): never automatic, each a person's explicit choice.

const fromCallSchema = z.object({ projectId: z.uuid(), sheetId: z.uuid() });

/** « Reprendre les actions du call »: each confirmed action point not yet in
 * the plan becomes a draft, with no pressenti nor date (nobody is guessed). */
export async function planFromCallItems(
  input: z.input<typeof fromCallSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = fromCallSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const { projectId, sheetId } = parsed.data;
  const supabase = await createClient();
  const org = await sheetOrg(supabase, projectId, sheetId);
  if (!org) return forbidden;
  const [items, planned] = await Promise.all([
    supabase
      .from("production_call_items")
      .select("id, body")
      .eq("sheet_id", sheetId)
      .eq("kind", "action")
      .eq("status", "confirmed")
      .order("position"),
    supabase
      .from("production_plan_actions")
      .select("item_id")
      .eq("sheet_id", sheetId)
      .not("item_id", "is", null),
  ]);
  const taken = new Set((planned.data ?? []).map((a) => a.item_id));
  const fresh = (items.data ?? []).filter((i) => !taken.has(i.id));
  if (fresh.length === 0) return prepDone(projectId);
  const start = await nextPosition(
    supabase,
    "production_plan_actions",
    sheetId,
  );
  const { error } = await supabase.from("production_plan_actions").insert(
    fresh.map((item, index) => ({
      organization_id: org,
      project_id: projectId,
      sheet_id: sheetId,
      item_id: item.id,
      title: item.body.slice(0, 300),
      position: start + index,
    })),
  );
  return error ? preprodFailure(error) : prepDone(projectId);
}

const taskSchema = z.object({
  projectId: z.uuid(),
  actionId: z.uuid(),
  assigneePersonId: z.uuid(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** « Créer dans Travail », after the owner confirmed the assignee and the
 * date: the task is created once (create_production_task). */
export async function createTaskFromAction(
  input: z.input<typeof taskSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_production_task", {
    p_action_id: p.actionId,
    p_assignee_person_id: p.assigneePersonId,
    p_due_date: p.dueDate,
  });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}

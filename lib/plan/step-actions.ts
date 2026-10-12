"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fail, fromDatabaseError } from "@/lib/framing/result";
import { fr } from "@/lib/i18n/fr";
import { PLAN_COLUMNS, PLAN_WORKFLOWS } from "@/lib/plan/propose";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The launched plan's steps (PROJ-UX-07): changed, added, moved or marked
// done by the project's owner only (checked by the database), every change
// in the plan's history (project_plan_events).

const values = z.object({
  column: z.enum(PLAN_COLUMNS),
  title: z.string().trim().max(200).nullable(),
  ownerPersonId: z.uuid().nullable(),
  executorPersonId: z.uuid().nullable(),
  dueDate: z.iso.date().nullable(),
  dependsOn: z.array(z.enum(PLAN_WORKFLOWS)).max(PLAN_WORKFLOWS.length),
});
export type PlanStepValues = z.input<typeof values>;

const failure = (code: Parameters<typeof fail>[0]): WriteResult => ({
  ok: false,
  error: fr.framing.errors[code],
});

async function done(
  projectId: string,
  error: { code?: string; message?: string } | null,
): Promise<WriteResult> {
  if (error) {
    const result = fromDatabaseError(error);
    return failure(result.ok ? "generic" : result.error);
  }
  revalidatePath(routes.project(projectId), "layout");
  return { ok: true };
}

export async function updatePlanStep(
  projectId: string,
  itemId: string,
  input: PlanStepValues,
): Promise<WriteResult> {
  const ids = z.object({ projectId: z.uuid(), itemId: z.uuid() });
  const p = values.safeParse(input);
  if (!ids.safeParse({ projectId, itemId }).success || !p.success)
    return failure("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_project_plan_item", {
    p_item_id: itemId,
    p_column: p.data.column,
    p_title: p.data.title,
    p_owner: p.data.ownerPersonId,
    p_executor: p.data.executorPersonId,
    p_due_date: p.data.dueDate,
    p_depends_on: p.data.dependsOn,
  });
  return done(projectId, error);
}

export async function addPlanStep(
  projectId: string,
  input: PlanStepValues,
): Promise<WriteResult> {
  const p = values.safeParse(input);
  if (!z.uuid().safeParse(projectId).success || !p.success)
    return failure("invalid_input");
  if (!p.data.title) return failure("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_project_plan_item", {
    p_project_id: projectId,
    p_title: p.data.title,
    p_column: p.data.column,
    p_owner: p.data.ownerPersonId,
    p_executor: p.data.executorPersonId,
    p_due_date: p.data.dueDate,
    p_depends_on: p.data.dependsOn,
  });
  return done(projectId, error);
}

export async function movePlanStep(
  projectId: string,
  itemId: string,
  offset: -1 | 1,
): Promise<WriteResult> {
  const p = z
    .object({
      projectId: z.uuid(),
      itemId: z.uuid(),
      offset: z.union([z.literal(-1), z.literal(1)]),
    })
    .safeParse({ projectId, itemId, offset });
  if (!p.success) return failure("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_project_plan_item", {
    p_item_id: itemId,
    p_offset: offset,
  });
  return done(projectId, error);
}

export async function setPlanStepDone(
  projectId: string,
  itemId: string,
  isDone: boolean,
): Promise<WriteResult> {
  const p = z
    .object({ projectId: z.uuid(), itemId: z.uuid(), isDone: z.boolean() })
    .safeParse({ projectId, itemId, isDone });
  if (!p.success) return failure("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_project_plan_item_done", {
    p_item_id: itemId,
    p_done: isDone,
  });
  return done(projectId, error);
}

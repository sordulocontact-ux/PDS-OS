"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

import {
  changed,
  forbidden,
  holderField,
  invalid,
  nextPosition,
  optionalDate,
  optionalText,
  preprodFailure,
  sheetOrg,
} from "./result";

// The preproduction plan (parcours 7). Approving, taking back to draft or
// removing is the owner's choice; « Créer dans Travail » is a separate,
// explicit confirmation (create_production_task). RLS: the owner, while
// Production runs.

const actionFields = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1).max(300),
  holder: holderField,
  dueDate: optionalDate,
  dependsOn: z.array(z.uuid()).max(50),
  blocking: z.boolean(),
  note: optionalText(1000),
});

const row = (a: z.output<typeof actionFields>) => ({
  title: a.title,
  person_id: a.holder.person,
  contact_id: a.holder.contact,
  due_date: a.dueDate,
  depends_on: a.dependsOn,
  blocking: a.blocking,
  note: a.note,
});

/** « Ajouter une action »: a draft. */
export async function addPlanAction(
  input: z.input<typeof actionFields> & { sheetId: string },
): Promise<PrepResult> {
  await requireApproved();
  const parsed = actionFields.safeParse(input);
  const sheetId = z.uuid().safeParse(input.sheetId);
  if (!parsed.success || !sheetId.success) return invalid;
  const supabase = await createClient();
  const org = await sheetOrg(supabase, parsed.data.projectId, sheetId.data);
  if (!org) return forbidden;
  const { error } = await supabase.from("production_plan_actions").insert({
    ...row(parsed.data),
    organization_id: org,
    project_id: parsed.data.projectId,
    sheet_id: sheetId.data,
    position: await nextPosition(
      supabase,
      "production_plan_actions",
      sheetId.data,
    ),
  });
  return error ? preprodFailure(error) : prepDone(parsed.data.projectId);
}

/** « Modifier »: everything but the state. */
export async function updatePlanAction(
  input: z.input<typeof actionFields> & { actionId: string },
): Promise<PrepResult> {
  await requireApproved();
  const parsed = actionFields.safeParse(input);
  const actionId = z.uuid().safeParse(input.actionId);
  if (!parsed.success || !actionId.success) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_plan_actions")
    .update(row(parsed.data))
    .eq("id", actionId.data)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(parsed.data.projectId) : forbidden;
}

const statusSchema = z.object({
  projectId: z.uuid(),
  actionIds: z.array(z.uuid()).min(1).max(100),
  status: z.enum(["draft", "approved", "removed"]),
});

/** « Approuver la sélection », « Remettre en brouillon », « Retirer »,
 * « Rétablir »: who approved and when, written by the database. */
export async function setPlanStatus(
  input: z.input<typeof statusSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_plan_actions")
    .update({ status: p.status })
    .in("id", p.actionIds)
    .eq("project_id", p.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(p.projectId) : forbidden;
}

const refSchema = z.object({ projectId: z.uuid(), actionId: z.uuid() });

/** « Supprimer » a draft (an action turned into a task stays: RLS). */
export async function deletePlanAction(
  input: z.input<typeof refSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = refSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_plan_actions")
    .delete()
    .eq("id", parsed.data.actionId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(parsed.data.projectId) : forbidden;
}

"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { id, orgId, text } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { createClient } from "@/lib/supabase/server";

// « Objectifs & KPIs »: each figure is typed by a person, never proposed by
// PO (CLAUDE.md, rule 6). The owner writes while the strategy is in progress
// (strategy_is_editable).

const optional = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.literal("")]).transform((v) => (v === "" ? null : v));

// "12 500", "12500,5": the figure as typed, French decimal comma allowed.
const target = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, "").replace(",", "."))
  .refine((v) => v === "" || /^\d{1,12}(\.\d{1,2})?$/.test(v))
  .transform((v) => (v === "" ? null : Number(v)));

const objectiveInput = z.object({
  label: text(200),
  target,
  unit: optional(text(40)),
  dueOn: optional(z.iso.date()),
});
export type ObjectiveInput = z.input<typeof objectiveInput>;

export async function addObjective(
  projectId: string,
  input: ObjectiveInput,
): Promise<ActionResult> {
  const p = objectiveInput.safeParse(input);
  const organizationId = await orgId();
  if (!p.success || !organizationId || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("strategy_objectives").insert({
    organization_id: organizationId,
    project_id: projectId,
    label: p.data.label,
    target: p.data.target,
    unit: p.data.unit,
    due_on: p.data.dueOn,
  });
  return done(projectId, error);
}

export async function updateObjective(
  projectId: string,
  objectiveId: string,
  input: ObjectiveInput,
): Promise<ActionResult> {
  const p = objectiveInput.safeParse(input);
  if (!p.success || !id.safeParse(objectiveId).success)
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategy_objectives")
    .update({
      label: p.data.label,
      target: p.data.target,
      unit: p.data.unit,
      due_on: p.data.dueOn,
    })
    .eq("id", objectiveId)
    .eq("project_id", projectId)
    .select("id");
  // RLS hides the row once the strategy is no longer editable.
  if (!error && data.length === 0) return fail("stage_locked");
  return done(projectId, error);
}

export async function removeObjective(
  projectId: string,
  objectiveId: string,
): Promise<ActionResult> {
  if (!id.safeParse(objectiveId).success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("strategy_objectives")
    .delete()
    .eq("id", objectiveId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

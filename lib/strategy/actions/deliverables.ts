"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { id, orgId, text } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { createClient } from "@/lib/supabase/server";

// « Livrables engagés »: what the strategy commits to produce, typed by a
// person (nature and number depend on the project, never a preset list).
// The selected lever and the project are checked in SQL
// (check_strategy_links); the owner writes while the strategy is in
// progress (strategy_is_editable).

const optional = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.literal("")]).transform((v) => (v === "" ? null : v));

// "5": how many; empty for a single one.
const quantity = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,2}$/.test(v))
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || (v >= 1 && v <= 99));

const deliverableInput = z.object({
  leverId: id,
  title: text(200),
  quantity,
  format: optional(text(80)).optional(),
  assigneePersonId: optional(id),
  dueDate: optional(z.iso.date()),
});
export type DeliverableInput = z.input<typeof deliverableInput>;

const columns = (p: z.output<typeof deliverableInput>) => ({
  lever_id: p.leverId,
  title: p.title,
  quantity: p.quantity,
  format: p.format ?? null,
  assignee_person_id: p.assigneePersonId,
  due_date: p.dueDate,
});

export async function addDeliverable(
  projectId: string,
  input: DeliverableInput,
): Promise<ActionResult> {
  const p = deliverableInput.safeParse(input);
  const organizationId = await orgId();
  if (!p.success || !organizationId || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("strategy_deliverables").insert({
    organization_id: organizationId,
    project_id: projectId,
    ...columns(p.data),
  });
  return done(projectId, error);
}

export async function updateDeliverable(
  projectId: string,
  deliverableId: string,
  input: DeliverableInput,
): Promise<ActionResult> {
  const p = deliverableInput.safeParse(input);
  if (!p.success || !id.safeParse(deliverableId).success)
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategy_deliverables")
    .update(columns(p.data))
    .eq("id", deliverableId)
    .eq("project_id", projectId)
    .select("id");
  // RLS leaves the row untouched once the strategy is no longer editable.
  if (!error && data.length === 0) return fail("stage_locked");
  return done(projectId, error);
}

export async function removeDeliverable(
  projectId: string,
  deliverableId: string,
): Promise<ActionResult> {
  if (!id.safeParse(deliverableId).success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("strategy_deliverables")
    .delete()
    .eq("id", deliverableId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

// MKT-S1-08: a lot created in one go — the ticked titles of one lever, with
// the same responsible and deadline. One insert: all or nothing.
const lotInput = z.object({
  leverId: id,
  items: z
    .array(z.object({ title: text(200), quantity }))
    .min(1)
    .max(20),
  assigneePersonId: optional(id),
  dueDate: optional(z.iso.date()),
});
export type LotInput = z.input<typeof lotInput>;

export async function addDeliverableLot(
  projectId: string,
  input: LotInput,
): Promise<ActionResult> {
  const p = lotInput.safeParse(input);
  const organizationId = await orgId();
  if (!p.success || !organizationId || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("strategy_deliverables").insert(
    p.data.items.map((item) => ({
      organization_id: organizationId,
      project_id: projectId,
      lever_id: p.data.leverId,
      title: item.title,
      quantity: item.quantity,
      assignee_person_id: p.data.assigneePersonId,
      due_date: p.data.dueDate,
    })),
  );
  return done(projectId, error);
}

// MKT-S1-08: the same responsible or deadline for several deliverables. An
// empty field leaves that column as it is.
const bulkInput = z.object({
  ids: z.array(id).min(1).max(100),
  assigneePersonId: optional(id),
  dueDate: optional(z.iso.date()),
});
export type BulkInput = z.input<typeof bulkInput>;

export async function updateDeliverables(
  projectId: string,
  input: BulkInput,
): Promise<ActionResult> {
  const p = bulkInput.safeParse(input);
  if (!p.success || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const patch = {
    ...(p.data.assigneePersonId
      ? { assignee_person_id: p.data.assigneePersonId }
      : {}),
    ...(p.data.dueDate ? { due_date: p.data.dueDate } : {}),
  };
  if (Object.keys(patch).length === 0) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategy_deliverables")
    .update(patch)
    .in("id", p.data.ids)
    .eq("project_id", projectId)
    .select("id");
  if (!error && data.length === 0) return fail("stage_locked");
  return done(projectId, error);
}

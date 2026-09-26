"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { id, orgId, text } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { createClient } from "@/lib/supabase/server";

// Committed deliverables and milestones: plain planning rows, entered by a
// person. Consistency (selected lever, same project) is checked in SQL.

const isoDate = z.iso.date();
const optional = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.literal("")]).transform((v) => (v === "" ? null : v));

const deliverableInput = z.object({
  leverId: id,
  title: text(200),
  assigneePersonId: optional(id),
  dueDate: optional(isoDate),
});

export async function addDeliverable(
  projectId: string,
  input: z.input<typeof deliverableInput>,
): Promise<ActionResult> {
  const p = deliverableInput.safeParse(input);
  const organizationId = await orgId();
  if (!p.success || !organizationId || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("strategy_deliverables").insert({
    organization_id: organizationId,
    project_id: projectId,
    lever_id: p.data.leverId,
    title: p.data.title,
    assignee_person_id: p.data.assigneePersonId,
    due_date: p.data.dueDate,
  });
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

const MILESTONE_KINDS = [
  "release",
  "announcement",
  "teaser",
  "content",
  "live",
  "press",
  "other",
] as const;

const milestoneInput = z.object({
  title: text(200),
  occursOn: isoDate,
  kind: z.enum(MILESTONE_KINDS),
  deliverableId: optional(id),
});

export async function addMilestone(
  projectId: string,
  input: z.input<typeof milestoneInput>,
): Promise<ActionResult> {
  const p = milestoneInput.safeParse(input);
  const organizationId = await orgId();
  if (!p.success || !organizationId || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("milestones").insert({
    organization_id: organizationId,
    project_id: projectId,
    title: p.data.title,
    occurs_on: p.data.occursOn,
    kind: p.data.kind,
    deliverable_id: p.data.deliverableId,
  });
  return done(projectId, error);
}

export async function removeMilestone(
  projectId: string,
  milestoneId: string,
): Promise<ActionResult> {
  if (!id.safeParse(milestoneId).success) return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("milestones")
    .delete()
    .eq("id", milestoneId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

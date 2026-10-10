"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { id, orgId, text } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { MILESTONE_CHANNELS } from "@/lib/strategy/calendar";
import { createClient } from "@/lib/supabase/server";

// Milestones of the calendar: plain planning rows, entered by a person
// (deliverables: lib/strategy/actions/deliverables.ts). Consistency (same
// project, linked deliverable) is checked in SQL.

const isoDate = z.iso.date();
const optional = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.literal("")]).transform((v) => (v === "" ? null : v));

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
  channel: z.enum(MILESTONE_CHANNELS),
  deliverableId: optional(id),
  notes: optional(text(1000)),
});
export type MilestoneInput = z.input<typeof milestoneInput>;

// A milestone is typed by a person; its date may come from « J-10 », the
// conversion is done in code on the client (lib/strategy/calendar.ts).
const milestoneRow = (p: z.output<typeof milestoneInput>) => ({
  title: p.title,
  occurs_on: p.occursOn,
  kind: p.kind,
  channel: p.channel,
  deliverable_id: p.deliverableId,
  notes: p.notes,
});

export async function addMilestone(
  projectId: string,
  input: MilestoneInput,
): Promise<ActionResult> {
  const p = milestoneInput.safeParse(input);
  const organizationId = await orgId();
  if (!p.success || !organizationId || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.from("milestones").insert({
    organization_id: organizationId,
    project_id: projectId,
    ...milestoneRow(p.data),
  });
  return done(projectId, error);
}

export async function updateMilestone(
  projectId: string,
  milestoneId: string,
  input: MilestoneInput,
): Promise<ActionResult> {
  const p = milestoneInput.safeParse(input);
  if (!p.success || !id.safeParse(milestoneId).success)
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("milestones")
    .update(milestoneRow(p.data))
    .eq("id", milestoneId)
    .eq("project_id", projectId)
    .select("id");
  // RLS leaves the row untouched once the strategy is no longer editable.
  if (!error && data.length === 0) return fail("stage_locked");
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

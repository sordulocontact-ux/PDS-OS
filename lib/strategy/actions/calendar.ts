"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { id, orgId, text } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { CHANNELS } from "@/lib/strategy/dimensions";
import { createClient } from "@/lib/supabase/server";

// The calendar (milestones with their channel and notes) and the quantity of
// a committed deliverable. The date is always entered by a person.

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
  occursOn: z.iso.date(),
  kind: z.enum(MILESTONE_KINDS),
  channel: z.enum(CHANNELS),
  notes: z.string().trim().max(1000),
  deliverableId: optional(id),
});

/** A milestone added or edited from its dialog (title, date, channel…). */
export async function saveMilestone(
  projectId: string,
  milestoneId: string | null,
  input: z.input<typeof milestoneInput>,
): Promise<ActionResult> {
  const p = milestoneInput.safeParse(input);
  const organizationId = await orgId();
  if (
    !p.success ||
    !organizationId ||
    !id.safeParse(projectId).success ||
    (milestoneId !== null && !id.safeParse(milestoneId).success)
  )
    return fail("invalid_input");
  const row = {
    title: p.data.title,
    occurs_on: p.data.occursOn,
    kind: p.data.kind,
    channel: p.data.channel,
    notes: p.data.notes || null,
    deliverable_id: p.data.deliverableId,
  };
  const supabase = await createClient();
  const { error } = milestoneId
    ? await supabase
        .from("milestones")
        .update(row)
        .eq("id", milestoneId)
        .eq("project_id", projectId)
    : await supabase.from("milestones").insert({
        ...row,
        organization_id: organizationId,
        project_id: projectId,
      });
  return done(projectId, error);
}

export async function setDeliverableQuantity(
  projectId: string,
  deliverableId: string,
  quantity: number | null,
): Promise<ActionResult> {
  if (
    !id.safeParse(deliverableId).success ||
    (quantity !== null &&
      !(Number.isInteger(quantity) && quantity >= 1 && quantity <= 99))
  )
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("strategy_deliverables")
    .update({ quantity })
    .eq("id", deliverableId)
    .eq("project_id", projectId);
  return done(projectId, error);
}

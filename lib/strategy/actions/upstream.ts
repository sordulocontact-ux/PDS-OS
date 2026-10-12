"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { id } from "@/lib/framing/actions/shared";
import { fail, type ActionResult } from "@/lib/framing/result";
import { done } from "@/lib/strategy/actions/shared";
import { leadDaysOf } from "@/lib/strategy/upstream";
import { createClient } from "@/lib/supabase/server";

// Arbitrating an upstream deadline really past (MKT-S1-04): shorter lead
// times for one deliverable, or the risk accepted for its milestone's date.
// Moving the milestone stays the milestone's own form. The owner writes
// while the strategy is in progress (strategy_is_editable); who accepted
// the risk and when is written by a trigger.

// "14": days before the milestone; empty = the label's default.
const leadDay = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{1,3}$/.test(v))
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || v <= 365);

const leadInput = z
  .object({ conception: leadDay, production: leadDay, validation: leadDay })
  // Conception ends before production, production before validation.
  .refine((v) => {
    const days = {
      conception_lead_days: v.conception,
      production_lead_days: v.production,
      validation_lead_days: v.validation,
    };
    const of = (key: "conception" | "production" | "validation") =>
      leadDaysOf({ id: "", title: "", ...days }, key);
    return (
      of("conception") >= of("production") &&
      of("production") >= of("validation")
    );
  });
export type LeadDaysInput = z.input<typeof leadInput>;

async function updateDeliverable(
  projectId: string,
  deliverableId: string,
  columns: {
    conception_lead_days?: number | null;
    production_lead_days?: number | null;
    validation_lead_days?: number | null;
    upstream_risk_accepted_for?: string | null;
  },
): Promise<ActionResult> {
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("strategy_deliverables")
    .update(columns)
    .eq("id", deliverableId)
    .eq("project_id", projectId)
    .select("id");
  // RLS leaves the row untouched once the strategy is no longer editable.
  if (!error && data.length === 0) return fail("stage_locked");
  return done(projectId, error);
}

export async function setUpstreamLeadDays(
  projectId: string,
  deliverableId: string,
  input: LeadDaysInput,
): Promise<ActionResult> {
  const p = leadInput.safeParse(input);
  if (!p.success || !id.safeParse(deliverableId).success)
    return fail("invalid_input");
  return updateDeliverable(projectId, deliverableId, {
    conception_lead_days: p.data.conception,
    production_lead_days: p.data.production,
    validation_lead_days: p.data.validation,
  });
}

/** Accepts the risk for this milestone date, or withdraws it (null). */
export async function acceptUpstreamRisk(
  projectId: string,
  deliverableId: string,
  milestoneDate: string | null,
): Promise<ActionResult> {
  if (
    !id.safeParse(deliverableId).success ||
    (milestoneDate !== null && !z.iso.date().safeParse(milestoneDate).success)
  )
    return fail("invalid_input");
  return updateDeliverable(projectId, deliverableId, {
    upstream_risk_accepted_for: milestoneDate,
  });
}

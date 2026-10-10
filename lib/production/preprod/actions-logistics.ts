"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { createClient } from "@/lib/supabase/server";

import {
  changed,
  forbidden,
  invalid,
  optionalDate,
  optionalText,
  preprodFailure,
} from "./result";

// The sheet's own location, schedule and envelope (parcours 6, 9): empty
// means the Fiche Livrable's value applies (lib/production/logistics.ts).
// RLS: the owner, while Production runs.

const locationSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  status: z.enum(["to_find", "to_verify", "confirmed"]),
  name: optionalText(200),
  address: optionalText(500),
  access: optionalText(2000),
  notes: optionalText(2000),
});

/** « Modifier le lieu »: pressenti (to verify) stays distinct from confirmed. */
export async function saveLocation(
  input: z.input<typeof locationSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_sheets")
    .update({
      location_status: p.status,
      location_name: p.name,
      location_address: p.address,
      location_access: p.access,
      location_notes: p.notes,
    })
    .eq("id", p.sheetId)
    .eq("project_id", p.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(p.projectId) : forbidden;
}

const scheduleSchema = z
  .object({
    projectId: z.uuid(),
    sheetId: z.uuid(),
    shootDate: optionalDate,
    postStart: optionalDate,
    postEnd: optionalDate,
    deliveryDate: optionalDate,
    envelope: z.string().max(40),
  })
  .refine((s) => !s.postStart || !s.postEnd || s.postStart <= s.postEnd);

/** « Modifier les dates »: the sheet's dates and envelope. */
export async function saveSchedule(
  input: z.input<typeof scheduleSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const envelope = parseEurosToCents(p.envelope);
  if (envelope === undefined) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_sheets")
    .update({
      shoot_date: p.shootDate,
      post_start: p.postStart,
      post_end: p.postEnd,
      delivery_date: p.deliveryDate,
      budget_envelope_cents: envelope,
    })
    .eq("id", p.sheetId)
    .eq("project_id", p.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(p.projectId) : forbidden;
}

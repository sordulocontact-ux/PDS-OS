"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

import {
  changed,
  forbidden,
  invalid,
  nextPosition,
  preprodFailure,
  sheetOrg,
} from "./result";
import { CALL_ITEM_KINDS } from "./types";

// What the technical call produced, point by point (parcours 5). A person's
// entry is confirmed at once; PO's proposals wait for a person's decision
// (who and when written by the database). RLS: the owner, while Production
// runs.

const itemFields = z.object({
  projectId: z.uuid(),
  topic: z.string().trim().min(1).max(200),
  kind: z.enum(CALL_ITEM_KINDS),
  body: z.string().trim().min(1).max(2000),
});

/** « Noter un point »: written by a person, outside a call's report. */
export async function addCallItem(
  input: z.input<typeof itemFields> & { sheetId: string },
): Promise<PrepResult> {
  await requireApproved();
  const parsed = itemFields.safeParse(input);
  const sheetId = z.uuid().safeParse(input.sheetId);
  if (!parsed.success || !sheetId.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const org = await sheetOrg(supabase, p.projectId, sheetId.data);
  if (!org) return forbidden;
  const { error } = await supabase.from("production_call_items").insert({
    organization_id: org,
    project_id: p.projectId,
    sheet_id: sheetId.data,
    topic: p.topic,
    kind: p.kind,
    body: p.body,
    status: "confirmed",
    source: "manual",
    position: await nextPosition(
      supabase,
      "production_call_items",
      sheetId.data,
    ),
  });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}

/** « Modifier »: the topic, nature and wording; a proposal stays one until
 * a person confirms it. */
export async function updateCallItem(
  input: z.input<typeof itemFields> & { itemId: string },
): Promise<PrepResult> {
  await requireApproved();
  const parsed = itemFields.safeParse(input);
  const itemId = z.uuid().safeParse(input.itemId);
  if (!parsed.success || !itemId.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_call_items")
    .update({ topic: p.topic, kind: p.kind, body: p.body })
    .eq("id", itemId.data)
    .eq("project_id", p.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(p.projectId) : forbidden;
}

const reviewSchema = z.object({
  projectId: z.uuid(),
  itemId: z.uuid(),
  status: z.enum(["confirmed", "rejected", "proposed"]),
});

/** « Confirmer » / « Rejeter » a proposal of PO (or take a decision back
 * to the proposal it was). */
export async function reviewCallItem(
  input: z.input<typeof reviewSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  let query = supabase
    .from("production_call_items")
    .update({ status: p.status })
    .eq("id", p.itemId)
    .eq("project_id", p.projectId);
  // Only PO's proposals go back to « proposé ».
  if (p.status === "proposed") query = query.eq("source", "call_report");
  const { data, error } = await query.select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(p.projectId) : forbidden;
}

const refSchema = z.object({ projectId: z.uuid(), itemId: z.uuid() });

/** « Supprimer » (confirmed): an action already in the plan loses its link. */
export async function deleteCallItem(
  input: z.input<typeof refSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = refSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_call_items")
    .delete()
    .eq("id", parsed.data.itemId)
    .eq("project_id", parsed.data.projectId)
    .select("id");
  if (error) return preprodFailure(error);
  return changed(data) ? prepDone(parsed.data.projectId) : forbidden;
}

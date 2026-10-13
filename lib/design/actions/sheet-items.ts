"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { designDone, type DesignResult } from "@/lib/design/actions/shared";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// The numbered items of a series (« Capsule 1 », « Capsule 2 »…), each with
// its objective, date and notes, and since MKT-C2-07 its own responsible,
// concept and reference. Written by whoever edits the sheet
// (design_sheet_can_edit); numbers follow the last one, never a fixed count.

const t = fr.conceptionSheet;
const fail = (error: string): DesignResult => ({ ok: false, error });

const itemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  objective: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v || null),
  deliveryDate: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v))
    .transform((v) => v || null),
  notes: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v || null),
  responsiblePersonId: z
    .union([z.uuid(), z.literal("")])
    .default("")
    .transform((v) => v || null),
  concept: z
    .string()
    .trim()
    .max(2000)
    .default("")
    .transform((v) => v || null),
  referenceUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v))
    .default("")
    .transform((v) => v || null),
});
export type SheetItemInput = z.input<typeof itemSchema>;

export async function addSheetItem(
  projectId: string,
  sheetId: string,
  input: SheetItemInput,
): Promise<DesignResult> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success || !z.uuid().safeParse(sheetId).success)
    return fail(t.errors.invalid);
  const access = await requireApproved();
  if (!access.organizationId) return fail(fr.conception.errors.generic);
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("design_sheet_items")
    .select("number")
    .eq("sheet_id", sheetId)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("design_sheet_items").insert({
    organization_id: access.organizationId,
    project_id: projectId,
    sheet_id: sheetId,
    number: (last?.number ?? 0) + 1,
    title: parsed.data.title,
    objective: parsed.data.objective,
    delivery_date: parsed.data.deliveryDate,
    notes: parsed.data.notes,
    responsible_person_id: parsed.data.responsiblePersonId,
    concept: parsed.data.concept,
    reference_url: parsed.data.referenceUrl,
  });
  return designDone(projectId, error, "addSheetItem");
}

export async function updateSheetItem(
  projectId: string,
  itemId: string,
  input: SheetItemInput,
): Promise<DesignResult> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success || !z.uuid().safeParse(itemId).success)
    return fail(t.errors.invalid);
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_sheet_items")
    .update({
      title: parsed.data.title,
      objective: parsed.data.objective,
      delivery_date: parsed.data.deliveryDate,
      notes: parsed.data.notes,
      responsible_person_id: parsed.data.responsiblePersonId,
      concept: parsed.data.concept,
      reference_url: parsed.data.referenceUrl,
    })
    .eq("id", itemId)
    .eq("project_id", projectId)
    .select("id");
  if (!error && (data ?? []).length === 0) return fail(t.frozen);
  return designDone(projectId, error, "updateSheetItem");
}

export async function removeSheetItem(
  projectId: string,
  itemId: string,
): Promise<DesignResult> {
  if (!z.uuid().safeParse(itemId).success) return fail(t.errors.invalid);
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_sheet_items")
    .delete()
    .eq("id", itemId)
    .eq("project_id", projectId)
    .select("id");
  if (!error && (data ?? []).length === 0) return fail(t.frozen);
  return designDone(projectId, error, "removeSheetItem");
}

/**
 * A series followed grouped (one decision for all its items) or decomposed
 * (one decision per item) — MKT-C2-07. Earlier decisions stay on their
 * versions; the next submission follows the choice (submit_design_sheet).
 */
export async function setSeriesTracking(
  projectId: string,
  sheetId: string,
  tracking: "global" | "per_item",
): Promise<DesignResult> {
  if (
    !z.uuid().safeParse(sheetId).success ||
    !["global", "per_item"].includes(tracking)
  )
    return fail(t.errors.invalid);
  await requireApproved();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_sheets")
    .update({ tracking })
    .eq("id", sheetId)
    .eq("project_id", projectId)
    .eq("kind", "series")
    .select("id");
  if (!error && (data ?? []).length === 0) return fail(t.frozen);
  return designDone(projectId, error, "setSeriesTracking");
}

"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { holderSchema } from "@/lib/production/post/result";
import { createClient } from "@/lib/supabase/server";

import {
  forbidden,
  invalid,
  optionalText,
  preprodFailure,
  sheetOrg,
} from "./result";
import { CALL_SHEET_LIMITS, CHECK_KEYS } from "./types";

// The call sheet and the checks before the shoot (parcours 10). Who updated
// the call sheet, who confirmed a check and when, are written by the
// database; « Prête pour tournage » only through mark_production_ready.

const callSheetSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  callTime: optionalText(CALL_SHEET_LIMITS.callTime),
  schedule: optionalText(CALL_SHEET_LIMITS.schedule),
  contactsNote: optionalText(CALL_SHEET_LIMITS.contactsNote),
  sequences: optionalText(CALL_SHEET_LIMITS.sequences),
  instructions: optionalText(CALL_SHEET_LIMITS.instructions),
  emergencies: optionalText(CALL_SHEET_LIMITS.emergencies),
  documentsNote: optionalText(CALL_SHEET_LIMITS.documentsNote),
});

/** « Compléter la feuille »: its own sections (team, place, equipment are
 * read from their tables). */
export async function saveCallSheet(
  input: z.input<typeof callSheetSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = callSheetSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const fields = {
    call_time: p.callTime,
    schedule: p.schedule,
    contacts_note: p.contactsNote,
    sequences: p.sequences,
    instructions: p.instructions,
    emergencies: p.emergencies,
    documents_note: p.documentsNote,
  };
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("production_call_sheets")
    .update(fields)
    .eq("sheet_id", p.sheetId)
    .eq("project_id", p.projectId)
    .select("sheet_id");
  if (error) return preprodFailure(error);
  if (updated.length > 0) return prepDone(p.projectId);
  const org = await sheetOrg(supabase, p.projectId, p.sheetId);
  if (!org) return forbidden;
  const { error: insertError } = await supabase
    .from("production_call_sheets")
    .insert({
      ...fields,
      sheet_id: p.sheetId,
      organization_id: org,
      project_id: p.projectId,
    });
  return insertError ? preprodFailure(insertError) : prepDone(p.projectId);
}

const checkSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  key: z.enum(CHECK_KEYS),
  // null: unchanged.
  confirmed: z.boolean().nullable(),
  required: z.boolean().nullable(),
  note: z.string().trim().max(1000),
});

/** « Confirmer », « Retirer », « Rendre requis », « Ne pas exiger ». */
export async function setReadinessCheck(
  input: z.input<typeof checkSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = checkSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_production_check", {
    p_sheet_id: p.sheetId,
    p_key: p.key,
    // The database reads null as « unchanged ».
    p_confirmed: p.confirmed as boolean,
    p_required: p.required as boolean,
    p_note: p.note,
  });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}

const readySchema = z.object({ projectId: z.uuid(), sheetId: z.uuid() });

/** « Marquer prête pour tournage »: refused while a required check is open. */
export async function markProductionReady(
  input: z.input<typeof readySchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = readySchema.safeParse(input);
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_production_ready", {
    p_sheet_id: parsed.data.sheetId,
  });
  return error ? preprodFailure(error) : prepDone(parsed.data.projectId);
}

const derogateSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  key: z.enum(CHECK_KEYS),
  reason: z.string().trim().min(1).max(1000),
});

/** « Déroger » (PROD-008): confirmed without its evidence, with a reason
 * and its author kept by the database. */
export async function derogateReadinessCheck(
  input: z.input<typeof derogateSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = derogateSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("derogate_production_check", {
    p_sheet_id: p.sheetId,
    p_key: p.key,
    p_reason: p.reason,
  });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}

const assignSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  key: z.enum(CHECK_KEYS),
  holder: holderSchema,
});

/** « Attribuer » (PROD-017): who secures a check; empty = the owner. */
export async function assignReadinessCheck(
  input: z.input<typeof assignSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const p = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_production_check", {
    p_sheet_id: p.sheetId,
    p_key: p.key,
    p_person_id: p.holder.personId,
    p_contact_id: p.holder.contactId,
  });
  return error ? preprodFailure(error) : prepDone(p.projectId);
}

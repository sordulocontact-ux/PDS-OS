"use server";

import { z } from "zod";

import {
  activationDone,
  activationFailure,
  invalid,
} from "@/lib/activations/result";
import { SHEET_FIELDS } from "@/lib/activations/sheets";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

const KEYS = [
  ...new Set([
    ...SHEET_FIELDS.framing_influence,
    ...SHEET_FIELDS.framing_press,
    ...SHEET_FIELDS.concept,
  ]),
] as [string, ...string[]];
const SOURCES = [
  "manual",
  "strategy",
  "calendar",
  "project",
  "framing",
  "concept",
] as const;

const saveSchema = z.object({
  projectId: z.uuid(),
  activationId: z.uuid(),
  kind: z.enum(["framing", "concept"]),
  targetId: z.uuid().nullable(),
  fields: z.record(
    z.enum(KEYS),
    z.object({ value: z.string().max(4000), source: z.enum(SOURCES) }),
  ),
});

/** « Enregistrer » : a draft is edited ; a validated, refused or submitted
 * version gets a new one (the database decides). Empty values are dropped. */
export async function saveSheet(
  input: z.input<typeof saveSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  const fields = Object.fromEntries(
    Object.entries(v.fields)
      .map(
        ([k, f]) => [k, { value: f.value.trim(), source: f.source }] as const,
      )
      .filter(([, f]) => f.value !== ""),
  );
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_activation_sheet", {
    p_activation_id: v.activationId,
    p_kind: v.kind,
    p_target_id: v.targetId,
    p_fields: fields,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

const decideSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  action: z.enum(["submit", "validate", "request_changes", "refuse"]),
  comment: z.string().max(2000),
});

/** « Soumettre » by the writer ; « Valider », « Demander des corrections »,
 * « Refuser » by a PDS validator, on this very version. */
export async function decideSheet(
  input: z.input<typeof decideSchema>,
): Promise<WriteResult> {
  await requireApproved();
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const v = parsed.data;
  if (["request_changes", "refuse"].includes(v.action) && !v.comment.trim())
    return invalid(fr.activations.errors.commentRequired);
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_activation_sheet", {
    p_sheet_id: v.sheetId,
    p_action: v.action,
    p_comment: v.comment,
  });
  return error ? activationFailure(error) : activationDone(v.projectId);
}

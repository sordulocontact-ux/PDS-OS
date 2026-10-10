"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { invalidInput, shootFailure } from "@/lib/production/shoot/result";
import {
  needsMissingSequences,
  SHOOT_STATES,
} from "@/lib/production/shoot/rules";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type ShootPatch = Database["public"]["Tables"]["production_shoots"]["Update"];

// "" clears a text: stored as null.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

const ref = z.object({ projectId: z.uuid(), sheetId: z.uuid() });

/** Updates the sheet's shoot, or creates it on its first write (an upsert
 * would also update the row's keys, which nobody may change). */
async function writeShoot(
  projectId: string,
  sheetId: string,
  patch: ShootPatch,
): Promise<PrepResult> {
  const access = await requireApproved();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("production_shoots")
    .select("sheet_id")
    .eq("sheet_id", sheetId)
    .maybeSingle();
  const { error } = existing
    ? await supabase
        .from("production_shoots")
        .update(patch)
        .eq("sheet_id", sheetId)
    : access.organizationId
      ? await supabase.from("production_shoots").insert({
          ...patch,
          sheet_id: sheetId,
          project_id: projectId,
          organization_id: access.organizationId,
        })
      : { error: { code: "42501", message: "not_allowed" } };
  return error ? shootFailure(error) : prepDone(projectId);
}

const stateSchema = ref.extend({
  state: z.enum(SHOOT_STATES),
  observations: optionalText(4000),
  missingSequences: optionalText(2000),
  deviations: optionalText(2000),
});

/** The shoot's state, observations, missing sequences and deviations. The
 * database refuses a start before « Prête pour tournage ». */
export async function saveShootState(
  input: z.input<typeof stateSchema>,
): Promise<PrepResult> {
  const parsed = stateSchema.safeParse(input);
  if (!parsed.success) return invalidInput;
  const d = parsed.data;
  if (needsMissingSequences(d.state) && d.missingSequences === null)
    return shootFailure({ message: "missing_sequences_required" });
  return writeShoot(d.projectId, d.sheetId, {
    state: d.state,
    observations: d.observations,
    missing_sequences: d.missingSequences,
    deviations: d.deviations,
  });
}

const declarationsSchema = ref.extend({
  videoRushes: z.boolean(),
  audioSources: z.boolean(),
  backupVerified: z.boolean(),
  filesLocation: optionalText(1000),
});

/** The three declarations and where the files are: who and when are stamped
 * by the database, nothing is checked on the files. */
export async function saveShootDeclarations(
  input: z.input<typeof declarationsSchema>,
): Promise<PrepResult> {
  const parsed = declarationsSchema.safeParse(input);
  if (!parsed.success) return invalidInput;
  const d = parsed.data;
  return writeShoot(d.projectId, d.sheetId, {
    video_rushes: d.videoRushes,
    audio_sources: d.audioSources,
    backup_verified: d.backupVerified,
    files_location: d.filesLocation,
  });
}

const noteSchema = ref.extend({ note: optionalText(4000) });

/** The report's own note (a change after validation reopens the report). */
export async function saveShootReportNote(
  input: z.input<typeof noteSchema>,
): Promise<PrepResult> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return invalidInput;
  const d = parsed.data;
  return writeShoot(d.projectId, d.sheetId, { report_note: d.note });
}

/** « Valider le compte rendu »: the note first, then the validation (the
 * owner, once the shoot ended). */
export async function validateShootReport(
  input: z.input<typeof noteSchema>,
): Promise<PrepResult> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return invalidInput;
  const d = parsed.data;
  const saved = await writeShoot(d.projectId, d.sheetId, {
    report_note: d.note,
  });
  if (!saved.ok) return saved;
  const supabase = await createClient();
  const { error } = await supabase.rpc("validate_production_shoot_report", {
    p_sheet_id: d.sheetId,
  });
  return error ? shootFailure(error) : prepDone(d.projectId);
}

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
import { schedulePendingPushes } from "@/lib/notifications/push";
import { holderSchema } from "@/lib/production/post/result";
import { createClient } from "@/lib/supabase/server";
import { loadShootData } from "@/lib/production/shoot/queries";
import { shootReport } from "@/lib/production/shoot/report";

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
  // « Reporté »: the new shoot date, written on the sheet (PROD-019).
  newShootDate: z.union([z.iso.date(), z.literal("")]).default(""),
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
  if (d.state === "postponed" && d.newShootDate === "") return invalidInput;
  if (d.state === "postponed") {
    // The sheet's date moves; the checks resting on it follow (z_recheck).
    const supabase = await createClient();
    const { error } = await supabase
      .from("production_sheets")
      .update({ shoot_date: d.newShootDate })
      .eq("id", d.sheetId)
      .eq("project_id", d.projectId);
    if (error) return shootFailure(error);
  }
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
  otherMedia: z.boolean().default(false),
  filesLocation: optionalText(1000),
  backupLocation: z.string().default("").pipe(optionalText(1000)),
  rushesHolder: z.string().default("").pipe(holderSchema),
  backupHolder: z.string().default("").pipe(holderSchema),
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
    other_media: d.otherMedia,
    files_location: d.filesLocation,
    backup_location: d.backupLocation,
    rushes_person_id: d.rushesHolder.personId,
    rushes_contact_id: d.rushesHolder.contactId,
    backup_person_id: d.backupHolder.personId,
    backup_contact_id: d.backupHolder.contactId,
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
  if (error) return shootFailure(error);
  // The report as validated, frozen with its validation (PROD-023).
  const access = await requireApproved();
  if (access.organizationId) {
    const data = await loadShootData({
      projectId: d.projectId,
      sheetId: d.sheetId,
      members: [],
      contacts: [],
    });
    const report = shootReport(data.shoot, data.incidents, data.equipment);
    const { error: snapError } = await supabase
      .from("production_shoots")
      .update({
        report_snapshot: {
          state: data.shoot.state,
          startedAt: data.shoot.startedAt,
          endedAt: data.shoot.endedAt,
          declarations: report.declarationsDone,
          incidents: data.incidents.map((i) => ({
            title: i.title,
            impacts: i.impacts,
            resolved: i.resolvedAt !== null,
          })),
          equipmentReturned: report.equipmentReturned,
          equipmentTotal: report.equipmentTotal,
          missingSequences: data.shoot.missingSequences,
          deviations: data.shoot.deviations,
          note: d.note,
        },
      })
      .eq("sheet_id", d.sheetId);
    if (snapError)
      console.error("validateShootReport snapshot:", snapError.message);
  }
  return prepDone(d.projectId);
}

/** « Lancer le tournage » (PROD-018): the shoot goes « En cours », once —
 * the database refuses it before « Prête pour tournage » (or derogated
 * checks), stamps who and when in the log, and tells the team. */
export async function startShoot(
  input: z.input<typeof ref>,
): Promise<PrepResult> {
  const parsed = ref.safeParse(input);
  if (!parsed.success) return invalidInput;
  const result = await writeShoot(parsed.data.projectId, parsed.data.sheetId, {
    state: "in_progress",
  });
  if (result.ok) await schedulePendingPushes();
  return result;
}

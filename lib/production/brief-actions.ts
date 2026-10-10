"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import {
  CAMERA_SETUPS,
  COVERAGES,
  MAX_BRIEF_TEXT,
  SOUND_CAPTURES,
} from "@/lib/production/brief";
import {
  prepDone,
  prepFailure,
  type PrepResult,
} from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

// A free text of the brief: trimmed, empty means « non renseigné ».
const text = z
  .string()
  .trim()
  .max(MAX_BRIEF_TEXT)
  .nullable()
  .transform((value) => (value ? value : null));

const briefSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  coverage: z.enum(COVERAGES).nullable(),
  cameraSetup: z.enum(CAMERA_SETUPS).nullable(),
  soundCapture: z.enum(SOUND_CAPTURES).nullable(),
  stagingIntent: text,
  coverageNote: text,
  cameraNote: text,
  soundNote: text,
  runOfShow: text,
  constraintsNote: text,
  referencesNote: text,
  openNeeds: text,
});

/** Saves the whole director's brief: the owner or the designated director
 * (a member), while Production runs (checked in SQL). */
export async function saveProductionBrief(
  input: z.input<typeof briefSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = briefSchema.safeParse(input);
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some(
      (issue) => issue.code === "too_big",
    );
    return {
      ok: false,
      error: tooLong
        ? fr.productionBrief.errors.tooLong
        : fr.productionPrep.errors.invalid,
    };
  }
  const b = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_production_brief", {
    p_sheet_id: b.sheetId,
    p_coverage: b.coverage,
    p_camera_setup: b.cameraSetup,
    p_sound_capture: b.soundCapture,
    p_staging_intent: b.stagingIntent,
    p_coverage_note: b.coverageNote,
    p_camera_note: b.cameraNote,
    p_sound_note: b.soundNote,
    p_run_of_show: b.runOfShow,
    p_constraints_note: b.constraintsNote,
    p_references_note: b.referencesNote,
    p_open_needs: b.openNeeds,
  });
  return error ? prepFailure(error) : prepDone(b.projectId);
}

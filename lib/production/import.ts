"use server";

import { z } from "zod";

import { PRODUCTION_IMPORT_INSTRUCTIONS } from "@/lib/ai/instructions/production-import";
import { extract } from "@/lib/ai/llm";
import { aiQuotaMessage } from "@/lib/ai/quota";
import { productionImportSchema } from "@/lib/ai/schemas/production-import";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import {
  cameraSetupOf,
  coverageOf,
  soundCaptureOf,
  type ProductionBrief,
} from "@/lib/production/brief";
import {
  applyImportSchema,
  MAX_IMPORT_TEXT,
  type ApplyImportInput,
  type ProductionImportProposals,
} from "@/lib/production/import-proposal";
import { verifyProductionImport } from "@/lib/production/import-verify";
import {
  prepDone,
  prepFailure,
  type PrepResult,
} from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

export type ProposeImportResult =
  | { ok: true; proposals: ProductionImportProposals }
  | { ok: false; error: string };

const e = fr.productionImport.errors;

const proposeSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  text: z.string().trim().min(1).max(MAX_IMPORT_TEXT),
});

/** The sheet and its brief, read with the user's session, once the owner may
 * organise it (RLS decides again on every write). */
async function loadWritableSheet(projectId: string, sheetId: string) {
  const supabase = await createClient();
  const [sheetRes, allowedRes] = await Promise.all([
    supabase
      .from("production_sheets")
      .select(
        "id, organization_id, coverage, camera_setup, sound_capture, staging_intent, coverage_note, camera_note, sound_note, run_of_show, constraints_note, references_note, open_needs",
      )
      .eq("id", sheetId)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase.rpc("production_can_organize", { p_project_id: projectId }),
  ]);
  const row = sheetRes.data;
  if (!row) return { ok: false as const, error: e.notFound };
  if (allowedRes.data !== true)
    return { ok: false as const, error: e.forbidden };
  const brief: ProductionBrief = {
    coverage: coverageOf(row.coverage),
    cameraSetup: cameraSetupOf(row.camera_setup),
    soundCapture: soundCaptureOf(row.sound_capture),
    stagingIntent: row.staging_intent,
    coverageNote: row.coverage_note,
    cameraNote: row.camera_note,
    soundNote: row.sound_note,
    runOfShow: row.run_of_show,
    constraintsNote: row.constraints_note,
    referencesNote: row.references_note,
    openNeeds: row.open_needs,
  };
  return {
    ok: true as const,
    supabase,
    organizationId: row.organization_id,
    brief,
  };
}

/**
 * « Proposer »: PO reads the pasted organisation (data, never an
 * instruction) and the code keeps what it can verify. Nothing is stored:
 * the text and the proposals live in the dialog until « Appliquer ».
 */
export async function proposeProductionImport(input: {
  projectId: string;
  sheetId: string;
  text: string;
}): Promise<ProposeImportResult> {
  await requireApproved();
  const parsed = proposeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const { projectId, sheetId, text } = parsed.data;
  const sheet = await loadWritableSheet(projectId, sheetId);
  if (!sheet.ok) return sheet;

  const { data: needs } = await sheet.supabase
    .from("production_needs")
    .select("family, role_key, label, speciality")
    .eq("sheet_id", sheetId);

  let output;
  try {
    ({ output } = await extract(
      productionImportSchema,
      `<texte_importe>\n${text}\n</texte_importe>`,
      PRODUCTION_IMPORT_INSTRUCTIONS,
    ));
  } catch (error) {
    console.error("proposeProductionImport:", error);
    return { ok: false, error: aiQuotaMessage(error) ?? e.provider };
  }
  const existing = (needs ?? []).map((n) => ({
    family: n.family,
    roleKey: n.role_key,
    label: n.label,
    speciality: n.speciality,
  }));
  return {
    ok: true,
    proposals: verifyProductionImport(output, text, sheet.brief, existing),
  };
}

/**
 * « Appliquer »: what the person kept, written with their session. The
 * needs first (one insert), then the brief merged with its current values
 * read again here: a topic not sent keeps its value.
 */
export async function applyProductionImport(
  input: ApplyImportInput,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = applyImportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: e.invalid };
  const { projectId, sheetId, brief: changes, needs } = parsed.data;
  if (changes.length === 0 && needs.length === 0)
    return { ok: false, error: e.nothing };
  const sheet = await loadWritableSheet(projectId, sheetId);
  if (!sheet.ok) return sheet;
  const { supabase } = sheet;

  if (needs.length > 0) {
    const { data: last } = await supabase
      .from("production_needs")
      .select("position")
      .eq("sheet_id", sheetId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const start = (last?.position ?? -1) + 1;
    const { error } = await supabase.from("production_needs").insert(
      needs.map((n, index) => ({
        organization_id: sheet.organizationId,
        project_id: projectId,
        sheet_id: sheetId,
        family: n.family,
        role_key: n.roleKey,
        label: n.roleKey === "other" ? n.label : null,
        speciality: n.speciality,
        headcount: n.headcount,
        position: start + index,
      })),
    );
    if (error) return prepFailure(error);
  }

  if (changes.length > 0) {
    const merged: ProductionBrief = { ...sheet.brief };
    for (const change of changes) {
      if (change.field === "coverage")
        merged.coverage = coverageOf(change.value);
      else if (change.field === "cameraSetup")
        merged.cameraSetup = cameraSetupOf(change.value);
      else if (change.field === "soundCapture")
        merged.soundCapture = soundCaptureOf(change.value);
      else merged[change.field] = change.value;
    }
    const { error } = await supabase.rpc("save_production_brief", {
      p_sheet_id: sheetId,
      p_coverage: merged.coverage,
      p_camera_setup: merged.cameraSetup,
      p_sound_capture: merged.soundCapture,
      p_staging_intent: merged.stagingIntent,
      p_coverage_note: merged.coverageNote,
      p_camera_note: merged.cameraNote,
      p_sound_note: merged.soundNote,
      p_run_of_show: merged.runOfShow,
      p_constraints_note: merged.constraintsNote,
      p_references_note: merged.referencesNote,
      p_open_needs: merged.openNeeds,
    });
    if (error) return prepFailure(error);
  }
  return prepDone(projectId);
}

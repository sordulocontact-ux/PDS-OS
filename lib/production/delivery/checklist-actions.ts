"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { expectedLines } from "@/lib/production/delivery/expected";
import { deliveryFailure } from "@/lib/production/delivery/result";
import { EXPORT_CHECK_KINDS } from "@/lib/production/delivery/rules";
import { loadHandedFiche } from "@/lib/production/fiche";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

// The technical check's lines (production_export_checks): written by the
// owner while the Production runs (RLS production_can_organize); who checked
// and when is stamped by the database.

const e = fr.productionDelivery.errors;
const invalidText = fr.productionPrep.errors.invalid;
const invalid: PrepResult = { ok: false, error: invalidText };
const httpsUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v));

const createSchema = z.object({ projectId: z.uuid(), sheetId: z.uuid() });

/** « Créer la checklist »: the lines the Fiche Livrable expects, read again
 * here (never from the browser); those already there are kept. */
export async function createExportChecklist(
  input: z.input<typeof createSchema>,
): Promise<PrepResult> {
  const access = await requireApproved();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success || !access.organizationId) return invalid;
  const { projectId, sheetId } = parsed.data;
  const supabase = await createClient();
  const { data: sheet } = await supabase
    .from("production_sheets")
    .select("deliverable_id, handoff_id")
    .eq("id", sheetId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!sheet) return { ok: false, error: fr.productionPrep.errors.notFound };
  const [{ fiche }, { data: existing }] = await Promise.all([
    loadHandedFiche(supabase, sheet.deliverable_id, sheet.handoff_id),
    supabase
      .from("production_export_checks")
      .select("label, position")
      .eq("sheet_id", sheetId),
  ]);
  const present = new Set((existing ?? []).map((l) => l.label));
  const start = Math.max(-1, ...(existing ?? []).map((l) => l.position)) + 1;
  const rows = expectedLines(fiche)
    .filter((line) => !present.has(line.label))
    .map((line, i) => ({
      organization_id: access.organizationId as string,
      project_id: projectId,
      sheet_id: sheetId,
      label: line.label,
      kind: line.kind,
      position: start + i,
    }));
  if (rows.length === 0) return { ok: false, error: e.nothingToCreate };
  const { error } = await supabase
    .from("production_export_checks")
    .insert(rows);
  return error ? deliveryFailure(error) : prepDone(projectId);
}

const lineSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  // Absent = a new line.
  checkId: z.uuid().optional(),
  label: z.string().trim().min(1).max(120),
  kind: z.enum(EXPORT_CHECK_KINDS),
  url: httpsUrl,
});

/** Adds an expected file, or edits one. A new link on a checked line clears
 * its result: the file is to check again (and the delivery reopens). */
export async function saveExportCheck(
  input: z.input<typeof lineSchema>,
): Promise<PrepResult> {
  const access = await requireApproved();
  const parsed = lineSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.path[0];
    return {
      ok: false,
      error:
        issue === "label" ? e.label : issue === "url" ? e.url : invalidText,
    };
  }
  if (!access.organizationId) return invalid;
  const { projectId, sheetId, checkId, label, kind } = parsed.data;
  const url = parsed.data.url || null;
  const supabase = await createClient();

  if (!checkId) {
    const { data: last } = await supabase
      .from("production_export_checks")
      .select("position")
      .eq("sheet_id", sheetId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("production_export_checks").insert({
      organization_id: access.organizationId,
      project_id: projectId,
      sheet_id: sheetId,
      label,
      kind,
      url,
      position: (last?.position ?? -1) + 1,
    });
    return error ? deliveryFailure(error) : prepDone(projectId);
  }

  const { data: current } = await supabase
    .from("production_export_checks")
    .select("url")
    .eq("id", checkId)
    .eq("sheet_id", sheetId)
    .maybeSingle();
  if (!current) return { ok: false, error: fr.productionPrep.errors.notFound };
  const fileChanged = current.url !== url;
  const { error } = await supabase
    .from("production_export_checks")
    .update({
      label,
      kind,
      url,
      ...(fileChanged ? { result: null, note: null } : {}),
    })
    .eq("id", checkId);
  return error ? deliveryFailure(error) : prepDone(projectId);
}

const resultSchema = z
  .object({
    projectId: z.uuid(),
    checkId: z.uuid(),
    result: z.enum(["ok", "not_ok"]),
    note: z.string().trim().max(1000),
  })
  .refine((v) => v.result === "ok" || v.note !== "", { path: ["note"] });

/** « Conforme » / « Non conforme » (a note says why). Checking again with
 * the same result stamps a new check (who, when). */
export async function setExportCheckResult(
  input: z.input<typeof resultSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success)
    return parsed.error.issues[0]?.path[0] === "note"
      ? { ok: false, error: e.noteRequired }
      : invalid;
  const { projectId, checkId, result, note } = parsed.data;
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("production_export_checks")
    .select("result")
    .eq("id", checkId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!current) return { ok: false, error: fr.productionPrep.errors.notFound };
  // The database stamps who and when on a change of result only.
  if (current.result === result) {
    const { error } = await supabase
      .from("production_export_checks")
      .update({ result: null })
      .eq("id", checkId);
    if (error) return deliveryFailure(error);
  }
  const { error } = await supabase
    .from("production_export_checks")
    .update({ result, note: note || null })
    .eq("id", checkId);
  return error ? deliveryFailure(error) : prepDone(projectId);
}

const removeSchema = z.object({ projectId: z.uuid(), checkId: z.uuid() });

export async function removeExportCheck(
  input: z.input<typeof removeSchema>,
): Promise<PrepResult> {
  await requireApproved();
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const supabase = await createClient();
  const { error } = await supabase
    .from("production_export_checks")
    .delete()
    .eq("id", parsed.data.checkId)
    .eq("project_id", parsed.data.projectId);
  return error ? deliveryFailure(error) : prepDone(parsed.data.projectId);
}

"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import {
  isProductionFilePath,
  MAX_PRODUCTION_FILE_BYTES,
  PRODUCTION_FILE_KINDS,
} from "@/lib/production/files/rules";
import { prepDone, prepFailure } from "@/lib/production/prep-result";
import { createClient } from "@/lib/supabase/server";

const fileSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  kind: z.enum(PRODUCTION_FILE_KINDS),
  path: z.string().max(200),
  fileName: z.string().trim().min(1).max(255),
  mime: z.string().trim().min(1).max(255),
  bytes: z.number().int().positive().max(MAX_PRODUCTION_FILE_BYTES),
  note: z.string().trim().max(1000),
});

export type RecordFileResult =
  { ok: true; fileId: string } | { ok: false; error: string };

/** The browser uploaded the object (storage RLS); this records it. */
export async function recordProductionFile(
  input: z.input<typeof fileSchema>,
): Promise<RecordFileResult> {
  const access = await requireApproved();
  const parsed = fileSchema.safeParse(input);
  const invalid = {
    ok: false as const,
    error: fr.productionPrep.errors.invalid,
  };
  if (!access.organizationId || !parsed.success) return invalid;
  const v = parsed.data;
  if (!isProductionFilePath(v.path, access.organizationId, v.projectId))
    return invalid;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("production_files")
    .insert({
      organization_id: access.organizationId,
      project_id: v.projectId,
      sheet_id: v.sheetId,
      kind: v.kind,
      path: v.path,
      file_name: v.fileName,
      mime: v.mime,
      bytes: v.bytes,
      note: v.note || null,
    })
    .select("id")
    .single();
  if (error || !data) {
    const failure = prepFailure(error ?? {});
    return { ok: false, error: failure.ok ? invalid.error : failure.error };
  }
  prepDone(v.projectId);
  return { ok: true, fileId: data.id };
}

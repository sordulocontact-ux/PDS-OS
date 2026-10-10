import { fileExtension } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import {
  recordProductionFile,
  type RecordFileResult,
} from "@/lib/production/files/actions";
import {
  MAX_PRODUCTION_FILE_BYTES,
  PRODUCTION_FILE_BUCKET,
  type ProductionFileKind,
} from "@/lib/production/files/rules";
import { createClient } from "@/lib/supabase/client";

/**
 * Browser-side: uploads the file straight to the private bucket (storage
 * RLS: the owner while Production runs), then records it; the row's id is
 * what a quote line, a reference, a version or a comment points to. Same
 * flow as the design files (lib/design/upload-version.ts).
 */
export async function uploadProductionFile(input: {
  organizationId: string;
  projectId: string;
  sheetId: string;
  kind: ProductionFileKind;
  note: string;
  file: File;
}): Promise<RecordFileResult> {
  const t = fr.productionPrep.errors;
  if (input.file.size === 0) return { ok: false, error: t.invalid };
  if (input.file.size > MAX_PRODUCTION_FILE_BYTES)
    return { ok: false, error: t.fileTooLarge };

  const ext = fileExtension(input.file.name);
  const path = `${input.organizationId}/${input.projectId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const mime = input.file.type || "application/octet-stream";
  const bucket = createClient().storage.from(PRODUCTION_FILE_BUCKET);
  const { error } = await bucket.upload(path, input.file, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    console.error("[production] file upload failed:", error.message);
    return { ok: false, error: t.uploadFailed };
  }
  const result = await recordProductionFile({
    projectId: input.projectId,
    sheetId: input.sheetId,
    kind: input.kind,
    path,
    fileName: input.file.name,
    mime,
    bytes: input.file.size,
    note: input.note,
  });
  // Not recorded: the object would be orphaned, remove it.
  if (!result.ok) await bucket.remove([path]);
  return result;
}

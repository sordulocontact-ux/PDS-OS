import type { ActivationFileKind } from "@/lib/activations/model";
import {
  ACTIVATION_FILE_BUCKET,
  MAX_ACTIVATION_FILE_BYTES,
} from "@/lib/activations/model";
import {
  recordActivationFile,
  type RecordActivationFileResult,
} from "@/lib/activations/files/actions";
import { fileExtension } from "@/lib/catalog/file-rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/client";

/**
 * Browser-side: uploads the file straight to the private bucket, then records
 * it; the row's id is what an evidence, an agency read or a payment points
 * to. Same flow as the Production files (lib/production/files/upload.ts).
 */
export async function uploadActivationFile(input: {
  organizationId: string;
  projectId: string;
  activationId: string;
  kind: ActivationFileKind;
  file: File;
}): Promise<RecordActivationFileResult> {
  const e = fr.activations.errors;
  if (input.file.size === 0) return { ok: false, error: e.invalid };
  if (input.file.size > MAX_ACTIVATION_FILE_BYTES)
    return { ok: false, error: e.fileTooLarge };
  const ext = fileExtension(input.file.name);
  const path = `${input.organizationId}/${input.projectId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const mime = input.file.type || "application/octet-stream";
  const bucket = createClient().storage.from(ACTIVATION_FILE_BUCKET);
  const { error } = await bucket.upload(path, input.file, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    console.error("[activations] file upload failed:", error.message);
    return { ok: false, error: e.uploadFailed };
  }
  const result = await recordActivationFile({
    projectId: input.projectId,
    activationId: input.activationId,
    kind: input.kind,
    path,
    fileName: input.file.name,
    mime,
    bytes: input.file.size,
  });
  if (!result.ok) await bucket.remove([path]);
  return result;
}

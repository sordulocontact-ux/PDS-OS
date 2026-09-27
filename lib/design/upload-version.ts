import { fileExtension } from "@/lib/catalog/file-rules";
import { recordDesignFile } from "@/lib/design/actions";
import { DESIGN_FILE_BUCKET, MAX_DESIGN_FILE_BYTES } from "@/lib/design/rules";
import { fail, type ActionResult } from "@/lib/framing/result";
import { createClient } from "@/lib/supabase/client";

/**
 * Browser-side: uploads the file straight to the private bucket (storage
 * RLS), then records the version through a server action. Same flow as the
 * artist files (lib/catalog/upload-file.ts).
 */
export async function uploadDesignFile(input: {
  organizationId: string;
  projectId: string;
  deliverableId: string | null;
  note: string;
  file: File;
}): Promise<ActionResult> {
  if (input.file.size === 0) return fail("invalid_input");
  if (input.file.size > MAX_DESIGN_FILE_BYTES) return fail("file_too_large");

  const ext = fileExtension(input.file.name);
  const path = `${input.organizationId}/${input.projectId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const mime = input.file.type || "application/octet-stream";
  const bucket = createClient().storage.from(DESIGN_FILE_BUCKET);
  const { error } = await bucket.upload(path, input.file, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    console.error("[design] file upload failed:", error.message);
    return fail("upload_failed");
  }

  const result = await recordDesignFile({
    projectId: input.projectId,
    deliverableId: input.deliverableId,
    note: input.note,
    path,
    fileName: input.file.name,
    mime,
    bytes: input.file.size,
  });
  // Not recorded: the object would be orphaned, remove it.
  if (!result.ok) await bucket.remove([path]);
  return result;
}

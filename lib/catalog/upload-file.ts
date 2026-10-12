import { recordCatalogFile } from "@/lib/catalog/file-actions";
import {
  FILE_BUCKETS,
  MAX_FILE_BYTES,
  fileExtension,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import type { AudioState } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/client";

/**
 * Browser-side: uploads the file straight to the owner's private bucket
 * (storage RLS: manage_catalog, the project's or the contract's writer),
 * then records it through a server action.
 * Same flow as the artist picture (lib/catalog/upload-picture.ts).
 */
export async function uploadCatalogFile(input: {
  organizationId: string;
  owner: FileOwner;
  category: string;
  description?: string | null;
  file: File;
  // A new version of this file (same category and precision).
  replacesId?: string;
  // An audio version of a title (category "audio").
  audioState?: AudioState;
  durationSeconds?: number | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const t = fr.catalogFiles;
  if (input.file.size === 0) return { ok: false, error: t.empty };
  if (input.file.size > MAX_FILE_BYTES) return { ok: false, error: t.tooLarge };

  const ext = fileExtension(input.file.name);
  const path = `${input.organizationId}/${input.owner.id}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const mime = input.file.type || "application/octet-stream";
  const bucket = createClient().storage.from(FILE_BUCKETS[input.owner.kind]);
  const { error } = await bucket.upload(path, input.file, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    console.error("[catalog] file upload failed:", error.message);
    return { ok: false, error: t.failed };
  }

  const result = await recordCatalogFile({
    owner: input.owner,
    path,
    category: input.category,
    description: input.description,
    fileName: input.file.name,
    mime,
    bytes: input.file.size,
    replacesId: input.replacesId,
    audioState: input.audioState,
    durationSeconds: input.durationSeconds,
  });
  // Not recorded: the object would be orphaned, remove it.
  if (!result.ok) await bucket.remove([path]);
  return result;
}

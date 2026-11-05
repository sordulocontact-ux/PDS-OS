import { coverThumbPath, isCoverImage } from "@/lib/catalog/cover-rules";
import { makeCoverThumb } from "@/lib/catalog/cover-thumb";
import { recordCatalogFile } from "@/lib/catalog/file-actions";
import {
  FILE_BUCKETS,
  maxFileBytes,
  fileExtension,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import type { AudioState } from "@/lib/catalog/title-rules";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";
import { createClient } from "@/lib/supabase/client";

const fr = { catalogFiles };

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
  // A working file of a title (retours 36 et 38).
  sessionId?: string | null;
  workStatus?: "provisional" | "final" | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const t = fr.catalogFiles;
  if (input.file.size === 0) return { ok: false, error: t.empty };
  if (input.file.size > maxFileBytes(input.owner.kind))
    return {
      ok: false,
      error: input.owner.kind === "master" ? t.tooLargeMaster : t.tooLarge,
    };

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
  const thumb = await uploadCoverThumb(bucket, input, path, mime);

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
    sessionId: input.sessionId,
    workStatus: input.workStatus,
  });
  // Not recorded: the object would be orphaned, remove it.
  if (!result.ok) await bucket.remove(thumb ? [path, thumb] : [path]);
  return result;
}

/**
 * The small copy of a title's cover (lib/catalog/cover-rules.ts), sent
 * beside it. Best effort: without it the original is shown.
 */
async function uploadCoverThumb(
  bucket: ReturnType<ReturnType<typeof createClient>["storage"]["from"]>,
  input: { owner: FileOwner; category: string; file: File },
  path: string,
  mime: string,
): Promise<string | null> {
  if (
    input.owner.kind !== "master" ||
    !isCoverImage({ category: input.category, mime })
  )
    return null;
  const blob = await makeCoverThumb(input.file);
  if (!blob) return null;
  const thumb = coverThumbPath(path);
  const { error } = await bucket.upload(thumb, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) {
    console.error("[catalog] cover thumbnail upload failed:", error.message);
    return null;
  }
  return thumb;
}

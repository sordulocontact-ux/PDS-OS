import "server-only";

import {
  coverThumbPath,
  isCoverImage,
  type MasterCover,
} from "@/lib/catalog/cover-rules";
import { FILE_BUCKETS } from "@/lib/catalog/file-rules";
import { createClient } from "@/lib/supabase/server";

// Signed URLs live one hour, as the title's files.
const SIGNED_URL_SECONDS = 3600;

type Row = {
  id: string;
  master_id: string;
  series_id: string;
  version: number;
  path: string;
  mime: string;
  file_name: string;
  created_at: string;
};

/**
 * The cover of each title (lib/catalog/cover-rules.ts), by title id: the
 * latest version of the most recently updated « Pochette » file that is an
 * image. `masterId` narrows to one title; without it, every title the
 * viewer reads (RLS), in one read run beside the list's own.
 */
export async function listMasterCovers(
  masterId?: string,
): Promise<Map<string, MasterCover>> {
  const covers = new Map<string, MasterCover>();
  const supabase = await createClient();
  const select = supabase
    .from("master_files")
    .select(
      "id, master_id, series_id, version, path, mime, file_name, created_at",
    )
    .eq("category", "artwork");
  const { data, error } = await (masterId
    ? select.eq("master_id", masterId)
    : select);
  if (error) {
    console.error("listMasterCovers:", error.message);
    return covers;
  }

  // The latest version of each series, then per title the series updated
  // last, if that version is an image.
  const latest = new Map<string, Row>();
  for (const row of data ?? []) {
    const known = latest.get(row.series_id);
    if (!known || row.version > known.version) latest.set(row.series_id, row);
  }
  const chosen = new Map<string, Row>();
  for (const row of latest.values()) {
    if (!isCoverImage({ category: "artwork", mime: row.mime })) continue;
    const known = chosen.get(row.master_id);
    if (!known || row.created_at > known.created_at)
      chosen.set(row.master_id, row);
  }
  if (chosen.size === 0) return covers;

  const rows = [...chosen.values()];
  const signed = await supabase.storage
    .from(FILE_BUCKETS.master)
    .createSignedUrls(
      rows.flatMap((row) => [coverThumbPath(row.path), row.path]),
      SIGNED_URL_SECONDS,
    );
  if (signed.error)
    console.error("listMasterCovers (sign):", signed.error.message);
  // A cover filed before its small copy existed signs only the original.
  const urlOf = new Map(
    (signed.data ?? []).flatMap((entry) =>
      entry.path && entry.signedUrl && !entry.error
        ? [[entry.path, entry.signedUrl]]
        : [],
    ),
  );
  for (const row of rows) {
    const fullUrl = urlOf.get(row.path);
    if (!fullUrl) continue;
    covers.set(row.master_id, {
      fileId: row.id,
      version: row.version,
      fileName: row.file_name,
      thumbUrl: urlOf.get(coverThumbPath(row.path)) ?? fullUrl,
      fullUrl,
    });
  }
  return covers;
}

/** The covers' small copies, by title id, for a list (serializable). */
export async function listMasterCoverThumbs(): Promise<Record<string, string>> {
  const covers = await listMasterCovers();
  return Object.fromEntries(
    [...covers].map(([masterId, cover]) => [masterId, cover.thumbUrl]),
  );
}

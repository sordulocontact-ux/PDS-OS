import "server-only";

import type { CatalogFile } from "@/lib/catalog/file-rules";
import type { ArtistMoodboard } from "@/lib/catalog/moodboard-rules";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/**
 * The artist's moodboard folders, newest first, each with its images taken
 * from the artist's library (`files`, read once by the page); `loose`: the
 * moodboard files in no folder (filed from the Fichiers tab).
 */
export async function listArtistMoodboards(
  artistId: string,
  files: CatalogFile[],
): Promise<{ moodboards: ArtistMoodboard[]; loose: CatalogFile[] }> {
  const supabase = await createClient();
  const [folders, links] = await Promise.all([
    supabase
      .from("artist_moodboards")
      .select(
        "id, title, note, source_url, created_at, created_by, author:people!artist_moodboards_created_by_fkey(first_name, last_name)",
      )
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false }),
    supabase
      .from("artist_files")
      .select("id, moodboard_id")
      .eq("artist_id", artistId)
      .eq("category", "moodboard"),
  ]);
  if (folders.error) console.error("listArtistMoodboards:", folders.error);
  if (links.error) console.error("listArtistMoodboards (files):", links.error);

  const folderOf = new Map(
    (links.data ?? []).map((row) => [row.id, row.moodboard_id]),
  );
  const byFolder = new Map<string, CatalogFile[]>();
  const loose: CatalogFile[] = [];
  // Oldest first inside a folder: the order the images were added.
  const moodboardFiles = files
    .filter((file) => file.category === "moodboard")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const file of moodboardFiles) {
    const folder = folderOf.get(file.id) ?? null;
    if (!folder) {
      loose.push(file);
      continue;
    }
    byFolder.set(folder, [...(byFolder.get(folder) ?? []), file]);
  }

  const moodboards = (folders.data ?? []).map((row): ArtistMoodboard => ({
    id: row.id,
    title: row.title,
    note: row.note,
    sourceUrl: row.source_url,
    createdAt: row.created_at,
    authorName: row.author
      ? personName(row.author.first_name, row.author.last_name)
      : "",
    authorPersonId: row.created_by,
    files: byFolder.get(row.id) ?? [],
  }));
  return { moodboards, loose: loose.reverse() };
}

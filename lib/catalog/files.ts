import "server-only";

import {
  FILE_BUCKETS,
  isFileCategory,
  withDownloadName,
  type CatalogFile,
  type CatalogFileVersion,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import { audioStateOf } from "@/lib/catalog/title-rules";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Signed URLs live one hour, as the artist pictures.
const SIGNED_URL_SECONDS = 3600;

const SELECT =
  "id, category, description, path, file_name, mime, bytes, created_at, created_by, series_id, version";
const MASTER_SELECT = `${SELECT}, audio_state, duration_seconds`;

/**
 * Which files of a title: its audio versions (Audio tab), or everything
 * else (Files tab). Artists have no audio versions.
 */
export type FileScope = "audio" | "other";

// The four tables share their columns; only the owner column differs.
async function readRows(owner: FileOwner, scope?: FileScope) {
  const supabase = await createClient();
  if (owner.kind === "contract")
    return supabase
      .from("contract_files")
      .select(
        `${SELECT}, author:people!contract_files_created_by_fkey(first_name, last_name)`,
      )
      .eq("contract_id", owner.id)
      .order("created_at", { ascending: false });
  if (owner.kind === "project")
    return supabase
      .from("project_files")
      .select(
        `${SELECT}, author:people!project_files_created_by_fkey(first_name, last_name)`,
      )
      .eq("project_id", owner.id)
      .order("created_at", { ascending: false });
  if (owner.kind === "master") {
    const query = supabase
      .from("master_files")
      .select(
        `${MASTER_SELECT}, author:people!master_files_created_by_fkey(first_name, last_name)`,
      )
      .eq("master_id", owner.id);
    const scoped =
      scope === "audio"
        ? query.eq("category", "audio")
        : scope === "other"
          ? query.neq("category", "audio")
          : query;
    return scoped.order("created_at", { ascending: false });
  }
  return supabase
    .from("artist_files")
    .select(
      `${SELECT}, author:people!artist_files_created_by_fkey(first_name, last_name)`,
    )
    .eq("artist_id", owner.id)
    .order("created_at", { ascending: false });
}

/**
 * Files of an artist, a master, a project or a contract, newest first, one
 * entry per file with its versions (the latest one leads), read with the
 * viewer's session: RLS hides contracts from a viewer who may not read them
 * (and a project's files from whoever does not see the project).
 */
export async function listCatalogFiles(
  owner: FileOwner,
  scope?: FileScope,
): Promise<{ files: CatalogFile[]; error: boolean }> {
  const { data, error } = await readRows(owner, scope);
  if (error) {
    console.error("listCatalogFiles:", error.message);
    return { files: [], error: true };
  }

  const rows = data ?? [];
  if (rows.length === 0) return { files: [], error: false };

  // One signing request for the whole list. The download name is a plain
  // query parameter beside the token (as storage-js adds it), so the same
  // signature serves both opening and downloading.
  const supabase = await createClient();
  const signed = await supabase.storage
    .from(FILE_BUCKETS[owner.kind])
    .createSignedUrls(
      rows.map((row) => row.path),
      SIGNED_URL_SECONDS,
    );
  if (signed.error)
    console.error("listCatalogFiles (sign):", signed.error.message);
  const urlOf = new Map(
    (signed.data ?? []).flatMap((entry) =>
      entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl]] : [],
    ),
  );

  type Row = (typeof rows)[number];
  const author = (row: Row) =>
    row.author ? personName(row.author.first_name, row.author.last_name) : "";
  const versionOf = (row: Row): CatalogFileVersion => {
    const openUrl = urlOf.get(row.path) ?? null;
    return {
      id: row.id,
      version: row.version,
      fileName: row.file_name,
      mime: row.mime,
      bytes: row.bytes,
      createdAt: row.created_at,
      authorName: author(row),
      openUrl,
      downloadUrl: openUrl && withDownloadName(openUrl, row.file_name),
    };
  };

  // One entry per series, led by its latest version; series in the order
  // of their latest version (newest first).
  const series = new Map<string, Row[]>();
  for (const row of rows) {
    const list = series.get(row.series_id);
    if (list) list.push(row);
    else series.set(row.series_id, [row]);
  }
  const files = [...series.values()]
    .map((list) => list.sort((a, b) => b.version - a.version))
    .sort((a, b) => b[0].created_at.localeCompare(a[0].created_at))
    .map((list): CatalogFile => {
      const row = list[0];
      // Only a title's files have these columns.
      const audio = row as {
        audio_state?: string | null;
        duration_seconds?: number | null;
      };
      const latest = versionOf(row);
      return {
        id: row.id,
        seriesId: row.series_id,
        version: row.version,
        versions: list.map(versionOf),
        category: isFileCategory(owner.kind, row.category)
          ? row.category
          : "other",
        description: row.description,
        fileName: row.file_name,
        mime: row.mime,
        bytes: row.bytes,
        audioState: audioStateOf(audio.audio_state ?? null),
        durationSeconds: audio.duration_seconds ?? null,
        createdAt: row.created_at,
        authorName: latest.authorName,
        authorPersonId: row.created_by,
        openUrl: latest.openUrl,
        downloadUrl: latest.downloadUrl,
      };
    });
  return { files, error: false };
}

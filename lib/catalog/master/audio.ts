import "server-only";

import {
  audioReviewOf,
  type AudioComment,
  type AudioVersion,
} from "@/lib/catalog/audio-versions";
import { FILE_BUCKETS, withDownloadName } from "@/lib/catalog/file-rules";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { audioStateOf } from "@/lib/catalog/title-rules";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_SECONDS = 3600;

type Person = { first_name: string | null; last_name: string | null } | null;
const nameOf = (p: Person) => (p ? personName(p.first_name, p.last_name) : "");

/**
 * The audio versions of a title with their decision, their comments and
 * whether a project's workflow uses them, read with the viewer's session
 * (retours Catalogue 10, 19, 25, 26). Numbering is done by the caller
 * (numberAudioVersions).
 */
export async function listAudioVersions(
  masterId: string,
): Promise<{ versions: AudioVersion[]; error: boolean }> {
  if (!catalogIdSchema.safeParse(masterId).success)
    return { versions: [], error: false };
  const supabase = await createClient();
  const [files, comments] = await Promise.all([
    supabase
      .from("master_files")
      .select(
        "id, path, file_name, mime, bytes, audio_state, duration_seconds, created_at, review_status, review_note, reviewed_at, author:people!master_files_created_by_fkey(first_name, last_name), reviewer:people!master_files_reviewed_by_fkey(first_name, last_name)",
      )
      .eq("master_id", masterId)
      .eq("category", "audio"),
    supabase
      .from("master_file_comments")
      .select(
        "id, file_id, at_seconds, body, created_at, author:people!master_file_comments_created_by_fkey(first_name, last_name)",
      )
      .eq("master_id", masterId)
      .order("at_seconds", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true }),
  ]);
  if (files.error || comments.error) {
    console.error(
      "listAudioVersions:",
      files.error?.message ?? comments.error?.message,
    );
    return { versions: [], error: true };
  }
  const rows = files.data ?? [];
  if (rows.length === 0) return { versions: [], error: false };

  const [signed, inUse] = await Promise.all([
    supabase.storage.from(FILE_BUCKETS.master).createSignedUrls(
      rows.map((row) => row.path),
      SIGNED_URL_SECONDS,
    ),
    Promise.all(
      rows.map((row) =>
        supabase.rpc("master_file_in_use", { p_file_id: row.id }),
      ),
    ),
  ]);
  if (signed.error)
    console.error("listAudioVersions (sign):", signed.error.message);
  const urlOf = new Map(
    (signed.data ?? []).flatMap((entry) =>
      entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl]] : [],
    ),
  );
  const commentsOf = new Map<string, AudioComment[]>();
  for (const c of comments.data ?? []) {
    const list = commentsOf.get(c.file_id) ?? [];
    list.push({
      id: c.id,
      atSeconds: c.at_seconds,
      body: c.body,
      authorName: nameOf(c.author),
      createdAt: c.created_at,
    });
    commentsOf.set(c.file_id, list);
  }

  return {
    versions: rows.flatMap((row, index): AudioVersion[] => {
      const state = audioStateOf(row.audio_state);
      if (!state) return [];
      const openUrl = urlOf.get(row.path) ?? null;
      return [
        {
          id: row.id,
          fileName: row.file_name,
          mime: row.mime,
          bytes: row.bytes,
          audioState: state,
          durationSeconds: row.duration_seconds,
          createdAt: row.created_at,
          authorName: nameOf(row.author),
          review: audioReviewOf(row.review_status),
          reviewNote: row.review_note,
          reviewedAt: row.reviewed_at,
          reviewerName: nameOf(row.reviewer),
          // Unknown (a failed read) is treated as used: never offered to
          // delete what may be referred to.
          inUse: inUse[index].error ? true : inUse[index].data === true,
          openUrl,
          downloadUrl: openUrl && withDownloadName(openUrl, row.file_name),
          comments: commentsOf.get(row.id) ?? [],
        },
      ];
    }),
    error: false,
  };
}

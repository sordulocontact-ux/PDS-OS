import "server-only";

import { ARTIST_PICTURE_BUCKET } from "@/lib/catalog/picture-rules";
import { createClient } from "@/lib/supabase/server";

// Pictures live in a private bucket: pages get short-lived signed URLs,
// created with the viewer's session (storage RLS: members of the org).
const SIGNED_URL_SECONDS = 3600;

/** Signed URL per storage path; a path that cannot be signed is left out. */
export async function signArtistPictures(
  paths: string[],
): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  if (paths.length === 0) return signed;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(ARTIST_PICTURE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) {
    console.error("signArtistPictures:", error.message);
    return signed;
  }
  for (const row of data) {
    if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
  }
  return signed;
}

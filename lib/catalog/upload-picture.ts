import {
  ARTIST_PICTURE_BUCKET,
  MAX_PICTURE_BYTES,
  PICTURE_EXTENSIONS,
} from "@/lib/catalog/picture-rules";
import { setArtistPicture } from "@/lib/catalog/profile-actions";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/client";

/**
 * Browser-side: uploads the picture straight to the private bucket (storage
 * RLS: manage_catalog), then records it on the artist through a server
 * action. Same flow as the call audio (lib/calls/upload-audio.ts).
 */
export async function uploadArtistPicture(input: {
  organizationId: string;
  artistId: string;
  file: File;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = fr.catalog.profileForm.picture;
  const ext = PICTURE_EXTENSIONS[input.file.type];
  if (!ext) return { ok: false, error: t.badType };
  if (input.file.size > MAX_PICTURE_BYTES)
    return { ok: false, error: t.tooLarge };

  const path = `${input.organizationId}/${input.artistId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient()
    .storage.from(ARTIST_PICTURE_BUCKET)
    .upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (error) {
    console.error("[catalog] picture upload failed:", error.message);
    return { ok: false, error: t.failed };
  }
  return setArtistPicture({ artistId: input.artistId, path });
}

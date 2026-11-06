import "server-only";

import { socialPicture } from "@/lib/integrations/social-picture";
import {
  MAX_UPLOADED_PICTURE_BYTES,
  NETWORK_PICTURE_BUCKET,
  NETWORK_PICTURE_EXTENSIONS,
  networkPictureSourceOf,
  type NetworkPictureSource,
} from "@/lib/network/picture-rules";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Pictures live in a private bucket: pages get short-lived signed URLs,
// created with the viewer's session (storage RLS: members of the org).
const SIGNED_URL_SECONDS = 3600;

/** Signed URL per storage path; a path that cannot be signed is left out. */
export async function signNetworkPictures(
  paths: string[],
): Promise<Map<string, string>> {
  const signed = new Map<string, string>();
  if (paths.length === 0) return signed;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(NETWORK_PICTURE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) {
    console.error("signNetworkPictures:", error.message);
    return signed;
  }
  for (const row of data) {
    if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
  }
  return signed;
}

/**
 * The picture sent with the contact form: absent, or a file the browser
 * cropped and resized (`NETWORK_PICTURE_PX`). "invalid": refused before
 * anything is saved.
 */
export function pictureFileOf(form: FormData): File | null | "invalid" {
  const file = form.get("picture");
  if (!(file instanceof File) || file.size === 0) return null;
  return NETWORK_PICTURE_EXTENSIONS[file.type] &&
    file.size <= MAX_UPLOADED_PICTURE_BYTES
    ? file
    : "invalid";
}

export type PictureState = {
  path: string | null;
  source: NetworkPictureSource | null;
  tiktok: string | null;
  instagram: string | null;
};

/** What decides a contact's picture, read before it is saved. */
export async function pictureStateOf(
  supabase: Supabase,
  id: string,
): Promise<PictureState | null> {
  const { data } = await supabase
    .from("network_contacts")
    .select("picture_path, picture_source, tiktok_handle, instagram_handle")
    .eq("id", id)
    .maybeSingle();
  return data
    ? {
        path: data.picture_path,
        source: networkPictureSourceOf(data.picture_source),
        tiktok: data.tiktok_handle,
        instagram: data.instagram_handle,
      }
    : null;
}

const NONE: PictureState = {
  path: null,
  source: null,
  tiktok: null,
  instagram: null,
};

/**
 * After a contact is saved, its picture. A file chosen by hand always wins
 * and stays until replaced or removed; « Retirer » is remembered ('none').
 * Otherwise the picture of its TikTok, else Instagram, profile is copied
 * here: when it has none yet, when the account it came from changed, or
 * after a removal once an account changes. A picture whose account is gone
 * and no other profile gives one is dropped. False: the file chosen by hand
 * could not be stored (a profile's picture failing is never an error).
 */
export async function updateContactPicture(
  supabase: Supabase,
  input: {
    organizationId: string;
    contactId: string;
    // Null: a new contact.
    before: PictureState | null;
    tiktok: string | null;
    instagram: string | null;
    upload: File | null;
    remove: boolean;
  },
): Promise<boolean> {
  const before = input.before ?? NONE;
  // `source` null or 'none' goes with no file.
  const store = async (
    source: NetworkPictureSource | null,
    file: { bytes: Blob | Uint8Array; type: string } | null,
  ) => {
    let path: string | null = null;
    if (file) {
      path = `${input.organizationId}/${input.contactId}/${crypto.randomUUID()}.${NETWORK_PICTURE_EXTENSIONS[file.type]}`;
      const { error } = await supabase.storage
        .from(NETWORK_PICTURE_BUCKET)
        .upload(path, file.bytes, { contentType: file.type, upsert: false });
      if (error) {
        console.error("updateContactPicture upload:", error.message);
        return false;
      }
    }
    const { error } = await supabase
      .from("network_contacts")
      .update({
        picture_path: path,
        picture_source: source,
      })
      .eq("id", input.contactId);
    if (error) {
      console.error("updateContactPicture:", error.message);
      return false;
    }
    if (before.path)
      await supabase.storage.from(NETWORK_PICTURE_BUCKET).remove([before.path]);
    return true;
  };

  if (input.upload)
    return store("upload", { bytes: input.upload, type: input.upload.type });
  if (input.remove) return before.source === "none" || store("none", null);

  const tiktokChanged = input.tiktok !== before.tiktok;
  const instagramChanged = input.instagram !== before.instagram;
  const stale =
    (before.source === "tiktok" && tiktokChanged) ||
    (before.source === "instagram" && instagramChanged);
  const refetch =
    before.source === null ||
    stale ||
    (before.source === "none" &&
      ((tiktokChanged && !!input.tiktok) ||
        (instagramChanged && !!input.instagram)));
  if (!refetch) return true;

  for (const platform of ["tiktok", "instagram"] as const) {
    const handle = input[platform];
    const picture = handle ? await socialPicture(platform, handle) : null;
    if (picture) {
      await store(platform, picture);
      return true;
    }
  }
  // The account it came from is gone and no profile gives another one.
  if (stale) await store(null, null);
  return true;
}

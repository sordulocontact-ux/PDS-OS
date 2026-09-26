// Uploaded artist pictures: bucket and accepted files. Client-safe (the
// browser checks before uploading; the bucket enforces the same limits).

export const ARTIST_PICTURE_BUCKET = "artist-pictures";
export const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

export const PICTURE_EXTENSIONS: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// "<organization_id>/<artist_id>/<uuid>.<ext>", as the database checks.
export function isArtistPicturePath(
  path: string,
  organizationId: string,
  artistId: string,
): boolean {
  const prefix = `${organizationId}/${artistId}/`;
  return (
    path.startsWith(prefix) &&
    /^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path.slice(prefix.length))
  );
}

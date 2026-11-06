// Pictures of the Réseau's contacts: bucket, accepted files, sources.
// Client-safe (the browser prepares the file, the server checks it again).

export const NETWORK_PICTURE_BUCKET = "network-pictures";
// The bucket's limit; a picture from a profile is far smaller.
export const MAX_NETWORK_PICTURE_BYTES = 5 * 1024 * 1024;
// A picture chosen by hand is cropped square and resized in the browser to
// this side (an avatar is never shown larger), so it fits a server action.
export const NETWORK_PICTURE_PX = 512;
// What a server action accepts for it once resized.
export const MAX_UPLOADED_PICTURE_BYTES = 900 * 1024;

export const NETWORK_PICTURE_EXTENSIONS: Record<
  string,
  "jpg" | "png" | "webp"
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// 'none': removed by hand, never taken from a profile again until its
// account changes (migration 20261105200101).
export type NetworkPictureSource = "upload" | "tiktok" | "instagram" | "none";

export function networkPictureSourceOf(
  value: string | null,
): NetworkPictureSource | null {
  return value === "upload" ||
    value === "tiktok" ||
    value === "instagram" ||
    value === "none"
    ? value
    : null;
}

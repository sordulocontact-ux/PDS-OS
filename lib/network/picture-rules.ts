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

// The profiles a picture is taken from, in this order: an artist's Spotify,
// else Deezer, then TikTok, else Instagram (Sacha, 06/11/2026).
export const PROFILE_PICTURE_SOURCES = [
  "spotify",
  "deezer",
  "tiktok",
  "instagram",
] as const;
export type ProfilePictureSource = (typeof PROFILE_PICTURE_SOURCES)[number];

// 'none': removed by hand, never taken from a profile again until its
// account changes (migrations 20261105200101, 20261106120101).
export type NetworkPictureSource = "upload" | ProfilePictureSource | "none";

const PICTURE_SOURCES: NetworkPictureSource[] = [
  "upload",
  ...PROFILE_PICTURE_SOURCES,
  "none",
];

export function networkPictureSourceOf(
  value: string | null,
): NetworkPictureSource | null {
  return PICTURE_SOURCES.find((source) => source === value) ?? null;
}

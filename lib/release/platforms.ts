/** Streaming platforms recognised from a URL. Pure code, importable anywhere. */

export const PLATFORMS = [
  "spotify",
  "appleMusic",
  "deezer",
  "youtubeMusic",
  "youtube",
  "tidal",
  "amazonMusic",
  "soundcloud",
] as const;

export type Platform = (typeof PLATFORMS)[number];

const HOSTS: Array<[pattern: RegExp, platform: Platform]> = [
  [/^open\.spotify\.com$/, "spotify"],
  [/^music\.apple\.com$/, "appleMusic"],
  [/^(www\.)?deezer\.com$/, "deezer"],
  [/^music\.youtube\.com$/, "youtubeMusic"],
  [/^((www|m)\.)?youtube\.com$|^youtu\.be$/, "youtube"],
  [/^(listen\.)?tidal\.com$/, "tidal"],
  [/^music\.amazon\.(com|fr|de|co\.uk|ca|it|es)$/, "amazonMusic"],
  [/^(www\.|m\.)?soundcloud\.com$/, "soundcloud"],
];

export function platformOf(url: string): Platform | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  return HOSTS.find(([pattern]) => pattern.test(host))?.[1] ?? null;
}

/** ISRC: 2-letter country, 3-char registrant, 2-digit year, 5-digit code. */
export function normalizeIsrc(input: string): string | null {
  const value = input.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(value) ? value : null;
}

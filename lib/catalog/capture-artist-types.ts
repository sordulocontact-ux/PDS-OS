/**
 * Artists read on a TikTok screenshot (Labo), as sent to the browser. The
 * names come from the model, checked against the text it read; the Deezer
 * account and its status are decided by the code (lib/catalog/capture-artists.ts).
 */

export type CaptureRole = "account" | "sound" | "mentioned";

/**
 * - linked: a Deezer account named after one name (written, or found inside
 *   one by PO), whose releases match another clue of the screenshot: a name
 *   (Huntrill → « BigSTRaat », Theodora → « Miss Kitoko ») or the bio link
 *   (bemyvalentinemrdj.lnk.to → « Be my Valentine ? / MR. DJ »);
 * - single: the only Deezer artist of that name with an audience, to check;
 * - several: several homonyms, nothing tells them apart;
 * - none: no Deezer artist has exactly one of the names.
 */
export type DeezerMatchStatus = "linked" | "single" | "several" | "none";

export type DeezerAccount = {
  deezerId: number;
  name: string;
  link: string;
  pictureUrl: string | null;
  fans: number;
  releaseCount: number;
  // Releases whose title matches another clue of the screenshot.
  evidence: string[];
  // Already in the catalog under that Deezer profile.
  existing: { id: string; name: string } | null;
};

/**
 * Where a social link comes from: read on the screenshot, confirmed by
 * TikTok's oEmbed, on the artist's Linktree, or linked to the Deezer profile
 * by MusicBrainz / Wikidata.
 */
export type SocialSource =
  "capture" | "tiktok" | "linktree" | "musicbrainz" | "wikidata";

// `label`: "@huntrill" for a handle, the artist's name for Spotify.
export type SocialLink = { label: string; url: string; source: SocialSource };

export type CaptureArtist = {
  names: string[];
  artistName: string;
  role: CaptureRole;
  reasoning: string;
  status: DeezerMatchStatus;
  account: DeezerAccount | null;
  others: DeezerAccount[];
  tiktok: SocialLink | null;
  instagram: SocialLink | null;
  spotify: SocialLink | null;
};

export type CaptureArtistsResult = {
  isTikTok: boolean;
  analysis: string;
  artists: CaptureArtist[];
  model: string;
  durationMs: number;
};

export type CaptureArtistsError =
  | "unauthorized"
  | "no_file"
  | "file_too_large"
  | "unsupported_type"
  | "provider_error"
  | "deezer_unavailable";

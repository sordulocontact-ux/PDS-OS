import type { ProfilePictureSource } from "@/lib/network/picture-rules";

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
 * - none: no Deezer artist has exactly one of the names;
 * - chosen: picked by a person in the Labo, among the homonyms or by a
 *   pasted link (set in the browser, never by the server).
 *
 * Homonyms are told apart by proofs (lib/catalog/capture-proofs.ts): the
 * Deezer profile linked to the same TikTok or Instagram by MusicBrainz /
 * Wikidata, or its Deezer biography citing a handle or a name of the
 * screenshot. Still several: PO compares them and leans for one, a person
 * chooses.
 */
export type DeezerMatchStatus =
  "linked" | "single" | "several" | "none" | "chosen";

/** The same account seen elsewhere: TikTok / Instagram of the screenshot. */
export type AccountMatch = {
  network: "tiktok" | "instagram";
  handle: string;
  source: "musicbrainz" | "wikidata";
};

export type DeezerAccount = {
  deezerId: number;
  name: string;
  link: string;
  pictureUrl: string | null;
  fans: number;
  releaseCount: number;
  // Releases whose title matches another clue of the screenshot.
  evidence: string[];
  // Handles or names of the screenshot cited by its Deezer biography, as
  // written on the screenshot.
  bioMatch: string[];
  accountMatch: AccountMatch | null;
  // The start of its Deezer biography, as text: shown to compare.
  bio: string | null;
  // Already in the catalog under that Deezer profile.
  existing: { id: string; name: string } | null;
};

/**
 * Where a social link comes from: read on the screenshot, in a shared link,
 * confirmed by TikTok, written in the TikTok bio, on the artist's Linktree,
 * or linked to the Deezer profile by MusicBrainz / Wikidata.
 */
export type SocialSource =
  | "capture"
  | "link"
  | "tiktok"
  | "bio"
  | "linktree"
  | "musicbrainz"
  | "wikidata";

// `label`: "@huntrill" for a handle, the artist's name for Spotify.
export type SocialLink = { label: string; url: string; source: SocialSource };

/**
 * What a person does, for the Réseau's roles: from a word read by the code
 * (in the TikTok bio or on the screenshot: « beatmaker », « type beat »…),
 * else from PO's reading of the screenshot. A proposal: the contact form
 * shows it pre-filled, a person saves it.
 */
export type ActivityRole = "artist" | "beatmaker";
export type CaptureActivity = {
  roles: ActivityRole[];
  // The word that says "beatmaker", as written; null when PO proposed it.
  clue: { text: string; source: "capture" | "tiktok" } | null;
};

export type CapturePicture = { url: string; source: ProfilePictureSource };

/** The public TikTok profile, read on its page (null when unread). */
export type CaptureTikTokProfile = {
  displayName: string;
  bio: string;
  bioLink: string | null;
  followers: number | null;
  videos: number | null;
  verified: boolean;
};

export type CaptureEmail = {
  value: string;
  source: "capture" | "tiktok" | "linktree";
};

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
  profile: CaptureTikTokProfile | null;
  // Their picture: an artist's Spotify, else Deezer (account found), else
  // TikTok, else Instagram profile picture; a link of the platform's image
  // host, shown, never stored (the Réseau copies its own on saving).
  picture: CapturePicture | null;
  email: CaptureEmail | null;
  activity: CaptureActivity;
  // Homonyms left undecided by the code: the one PO leans for (null when it
  // cannot lean either), and its comparison. A suggestion only, never the
  // account.
  suggestion: { deezerId: number | null; reasoning: string } | null;
  // Already in the Réseau: the contact with the same TikTok, Instagram or
  // Deezer account (never matched by name).
  contact: { id: string; name: string } | null;
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
  | "ai_quota"
  | "deezer_unavailable"
  // A shared link (lib/catalog/link-artist.ts).
  | "invalid_link"
  | "instagram_post"
  | "link_unreadable";

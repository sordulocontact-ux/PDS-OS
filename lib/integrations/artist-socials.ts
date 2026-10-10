import "server-only";

import { z } from "zod";

import { fetchJson, IntegrationError } from "@/lib/integrations/http";
import { wikidataItem } from "@/lib/integrations/wikipedia";

/**
 * An artist's TikTok and Instagram, from public sources only (no key, no
 * scraping): TikTok's official oEmbed confirms a profile exists; MusicBrainz
 * and Wikidata link a Deezer profile to the artist's accounts. Always by
 * Deezer id, never by name, so a homonym cannot be picked.
 */

// TikTok and Instagram usernames, Spotify artist id.
export type SocialHandles = {
  tiktok: string | null;
  instagram: string | null;
  spotify: string | null;
};

const NONE: SocialHandles = { tiktok: null, instagram: null, spotify: null };
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

// TikTok and Instagram usernames: letters, digits, "." and "_".
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;

export const tiktokUrl = (handle: string) =>
  `https://www.tiktok.com/@${handle}`;
export const instagramUrl = (handle: string) =>
  `https://www.instagram.com/${handle}/`;
export const spotifyUrl = (id: string) =>
  `https://open.spotify.com/artist/${id}`;

export const asHandle = (value: string | null | undefined) => {
  const handle = value?.trim().replace(/^@/, "") ?? "";
  return HANDLE.test(handle) ? handle : null;
};

const oembedSchema = z.object({
  author_url: z.url(),
  author_name: z.string(),
});

/**
 * The TikTok profile behind a handle, or null when TikTok has none (a
 * misread handle). `undefined` when TikTok could not be asked.
 */
export async function tiktokProfile(
  handle: string,
): Promise<{ handle: string; displayName: string } | null | undefined> {
  const url = new URL("https://www.tiktok.com/oembed");
  url.searchParams.set("url", tiktokUrl(handle));
  try {
    const parsed = oembedSchema.safeParse(await fetchJson("tiktok", url));
    if (!parsed.success) return null;
    const confirmed = asHandle(
      new URL(parsed.data.author_url).pathname.replace(/^\/@?/, ""),
    );
    return confirmed
      ? { handle: confirmed, displayName: parsed.data.author_name.trim() }
      : null;
  } catch (error) {
    // TikTok answers 400 for a profile that does not exist.
    if (error instanceof IntegrationError && error.reason.startsWith("http_4"))
      return null;
    return undefined;
  }
}

// Spotify artist id out of open.spotify.com/artist/<id>?si=….
function spotifyIdFrom(resource: string): string | null {
  let url: URL;
  try {
    url = new URL(resource);
  } catch {
    return null;
  }
  const [kind, id] = url.pathname.split("/").filter(Boolean);
  return url.hostname === "open.spotify.com" &&
    kind === "artist" &&
    SPOTIFY_ID.test(id ?? "")
    ? id
    : null;
}

/** Every network of a list of profile URLs (an artist's own links). */
export function socialsFromUrls(urls: string[]): SocialHandles {
  return {
    tiktok: urls.map((u) => handleFrom(u, "tiktok.com")).find(Boolean) ?? null,
    instagram:
      urls.map((u) => handleFrom(u, "instagram.com")).find(Boolean) ?? null,
    spotify: urls.map(spotifyIdFrom).find(Boolean) ?? null,
  };
}

// Handle out of a profile URL: instagram.com/huntrillion/ → huntrillion.
function handleFrom(resource: string, host: string): string | null {
  let url: URL;
  try {
    url = new URL(resource);
  } catch {
    return null;
  }
  if (url.hostname.replace(/^www\./, "") !== host) return null;
  const first = url.pathname.split("/").filter(Boolean)[0];
  return asHandle(first?.replace(/^@/, ""));
}

const MUSICBRAINZ = "https://musicbrainz.org/ws/2";
// MusicBrainz allows one request per second per client.
const MUSICBRAINZ_GAP_MS = 1100;
let musicbrainzQueue: Promise<unknown> = Promise.resolve();

function musicbrainz(path: string): Promise<unknown> {
  const call = musicbrainzQueue.then(() =>
    fetchJson("musicbrainz", `${MUSICBRAINZ}${path}`),
  );
  musicbrainzQueue = call
    .catch(() => undefined)
    .then(() => new Promise((r) => setTimeout(r, MUSICBRAINZ_GAP_MS)));
  return call;
}

const relationsSchema = z.object({
  relations: z.array(
    z.object({
      artist: z.object({ id: z.string() }).optional(),
      url: z.object({ resource: z.string() }).optional(),
    }),
  ),
});

async function fromMusicBrainz(deezerId: number): Promise<SocialHandles> {
  const deezer = encodeURIComponent(
    `https://www.deezer.com/artist/${deezerId}`,
  );
  const link = relationsSchema.safeParse(
    await musicbrainz(`/url?resource=${deezer}&inc=artist-rels&fmt=json`),
  );
  const artists = link.success
    ? [...new Set(link.data.relations.flatMap((r) => r.artist?.id ?? []))]
    : [];
  // Several artists claiming the same profile: ambiguous, better nothing.
  if (artists.length !== 1) return NONE;
  const parsed = relationsSchema.safeParse(
    await musicbrainz(`/artist/${artists[0]}?inc=url-rels&fmt=json`),
  );
  const urls = parsed.success
    ? parsed.data.relations.flatMap((r) => r.url?.resource ?? [])
    : [];
  return socialsFromUrls(urls);
}

const claimsSchema = z.object({
  entities: z.record(
    z.string(),
    z.object({
      claims: z
        .record(
          z.string(),
          z.array(
            z.object({
              mainsnak: z.object({
                datavalue: z.object({ value: z.unknown() }).optional(),
              }),
            }),
          ),
        )
        .optional(),
    }),
  ),
});

// Wikidata: P2003 = Instagram username, P7085 = TikTok username, P1902 =
// Spotify artist id.
async function fromWikidata(deezerId: number): Promise<SocialHandles> {
  const item = await wikidataItem(deezerId);
  if (!item) return NONE;
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.search = new URLSearchParams({
    action: "wbgetentities",
    ids: item,
    props: "claims",
    format: "json",
  }).toString();
  const parsed = claimsSchema.safeParse(await fetchJson("wikidata", url));
  const claims = parsed.success ? parsed.data.entities[item]?.claims : null;
  const first = (property: string) => {
    const value = claims?.[property]?.[0]?.mainsnak.datavalue?.value;
    return typeof value === "string" ? value : null;
  };
  const spotify = first("P1902");
  return {
    tiktok: asHandle(first("P7085")),
    instagram: asHandle(first("P2003")),
    spotify: spotify && SPOTIFY_ID.test(spotify) ? spotify : null,
  };
}

/**
 * The accounts linked to a Deezer profile, with where each one comes from.
 * A source that fails is skipped: the links are a bonus, never a blocker.
 */
export async function socialsOfDeezerArtist(
  deezerId: number,
): Promise<
  Record<
    keyof SocialHandles,
    { handle: string; source: "musicbrainz" | "wikidata" } | null
  >
> {
  const [mb, wd] = await Promise.all([
    fromMusicBrainz(deezerId).catch(() => NONE),
    fromWikidata(deezerId).catch(() => NONE),
  ]);
  const pick = (key: keyof SocialHandles) =>
    mb[key]
      ? { handle: mb[key], source: "musicbrainz" as const }
      : wd[key]
        ? { handle: wd[key], source: "wikidata" as const }
        : null;
  return {
    tiktok: pick("tiktok"),
    instagram: pick("instagram"),
    spotify: pick("spotify"),
  };
}

/**
 * A Deezer link pasted in the "Nouvel artiste" search: small artists never
 * surface in Deezer's name search, their page link finds them exactly.
 * Pure parsing, shared by the search field and the route.
 */

export type DeezerLink =
  // deezer.com/[fr/]artist/27 — the id is read from the path.
  | { kind: "artist"; id: number }
  // link.deezer.com/s/… — the app's share link, resolved by one redirect.
  | { kind: "share"; url: string }
  // Any other deezer.com page (track, album…): not an artist.
  | { kind: "other" };

const ARTIST_PATH = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?artist\/(\d{1,12})\/?$/i;
const SHARE_PATH = /^\/s\/[A-Za-z0-9]{4,64}\/?$/;

function toUrl(input: string): URL | null {
  const raw = input.trim();
  if (!/deezer\.com/i.test(raw) || /\s/.test(raw)) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

export function parseDeezerLink(input: string): DeezerLink | null {
  const url = toUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase();

  if (host === "link.deezer.com")
    return SHARE_PATH.test(url.pathname)
      ? { kind: "share", url: `https://link.deezer.com${url.pathname}` }
      : { kind: "other" };

  if (host !== "deezer.com" && host !== "www.deezer.com") return null;
  const artist = ARTIST_PATH.exec(url.pathname);
  return artist ? { kind: "artist", id: Number(artist[1]) } : { kind: "other" };
}

// Artist id of a deezer.com page URL (the target of a share link).
export function deezerArtistIdOf(url: string): number | null {
  const link = parseDeezerLink(url);
  return link?.kind === "artist" ? link.id : null;
}

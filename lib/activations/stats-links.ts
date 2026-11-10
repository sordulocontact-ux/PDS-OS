// The links whose public statistics PDS OS reads by itself (Sacha
// 10/11/2026: « si c'est un lien TikTok, on récupère les stats ; si c'est un
// lien YouTube… »): a TikTok video, a YouTube video or Short, a Deezer
// playlist. Instagram, Spotify and the others keep « Noter un relevé »: their
// figures are behind a login or a partner API (docs/CONTEXTE-PROJET.md § 5).
// Pure, client-safe.

export type StatsPlatform = "tiktok" | "youtube" | "deezer";

export const STATS_PLATFORM_NAMES: Record<StatsPlatform, string> = {
  tiktok: "TikTok",
  youtube: "YouTube",
  deezer: "Deezer",
};

export type StatsLink = {
  platform: StatsPlatform;
  // The link as declared (a TikTok short link is followed by the reader).
  url: string;
  // The video or playlist id when the link says it.
  id: string | null;
};

const host = (url: URL) => url.hostname.replace(/^(www|m)\./, "");

const YOUTUBE_ID = /^[\w-]{11}$/;

function youtubeId(url: URL): string | null {
  const h = host(url);
  if (h === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
  if (h !== "youtube.com" && h !== "music.youtube.com") return null;
  const v = url.searchParams.get("v");
  if (v) return v;
  const [, kind, id] = url.pathname.split("/");
  return ["shorts", "live", "embed"].includes(kind) ? (id ?? null) : null;
}

/** What platform a link's statistics can be read from, if any. */
export function statsLinkOf(raw: string | null): StatsLink | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const h = host(url);
  if (h === "tiktok.com") {
    const id = /^\/@[^/]+\/(?:video|photo)\/(\d+)/.exec(url.pathname)?.[1];
    return id ? { platform: "tiktok", url: raw, id } : null;
  }
  if (h === "vm.tiktok.com" || h === "vt.tiktok.com")
    return { platform: "tiktok", url: raw, id: null };
  const yt = youtubeId(url);
  if (yt && YOUTUBE_ID.test(yt))
    return { platform: "youtube", url: raw, id: yt };
  if (h === "deezer.com") {
    const id = /(?:^|\/)playlist\/(\d+)/.exec(url.pathname)?.[1];
    return id ? { platform: "deezer", url: raw, id } : null;
  }
  return null;
}

/** The host of a link no reader knows, for « à noter à la main ». */
export function linkHost(raw: string): string | null {
  try {
    return host(new URL(raw));
  } catch {
    return null;
  }
}

// An automatic snapshot's method: this word, then the link it was read from
// (no column holds the link: the method says how and where it was read).
export const AUTO_METHOD = "Relevé automatique";

export const autoMethod = (canonical: string) =>
  `${AUTO_METHOD} · ${canonical}`.slice(0, 300);

/** The link an automatic snapshot was read from, null for any other. */
export function autoLinkOf(method: string | null): string | null {
  const prefix = `${AUTO_METHOD} · `;
  return method?.startsWith(prefix) ? method.slice(prefix.length) : null;
}

/** The platforms PDS OS can read among these proofs (withdrawn ones aside). */
export function readablePlatforms(
  evidences: ReadonlyArray<{ url: string | null; withdrawnAt: string | null }>,
): string[] {
  const names = evidences
    .filter((e) => !e.withdrawnAt)
    .map((e) => statsLinkOf(e.url)?.platform)
    .filter((p): p is StatsPlatform => Boolean(p))
    .map((p) => STATS_PLATFORM_NAMES[p]);
  return [...new Set(names)];
}

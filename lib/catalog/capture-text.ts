/**
 * Comparing what a screenshot says with what a platform answers (Labo):
 * names without case, accents, spaces or punctuation, and the words a bio
 * link carries. Pure, client-safe.
 */

export const captureKey = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// "dj" or "jo" would match half of any discography.
export const MIN_CLUE_KEY = 4;

/**
 * The names PO proposed that are a piece of a written one (« Theodora » in
 * « theodorabosslady »), trimmed: a name it would have made up is dropped.
 */
export function piecesOf(proposed: string[], written: string[]): string[] {
  return proposed
    .map((n) => n.trim())
    .filter(
      (n) =>
        captureKey(n).length >= MIN_CLUE_KEY &&
        written.some((w) => captureKey(w).includes(captureKey(n))),
    );
}

// Parts of a link that say nothing about the artist.
const NOISE = new Set([
  "www",
  "http",
  "https",
  "lnk",
  "linktr",
  "linktree",
  "link",
  "links",
  "bio",
  "smarturl",
  "fanlink",
  "ffm",
  "found",
  "hypeddit",
  "orcd",
  "distrokid",
  "beacons",
  "instagram",
  "tiktok",
  "spotify",
  "deezer",
  "youtube",
  "apple",
  "music",
]);

const TRUNCATED = /(…|\.\.\.)$/;

/**
 * The words of the links written on a screenshot that may name a release:
 * "bemyvalentinemrdj.lnk.to/Th…" → ["bemyvalentinemrdj"]. A part cut by "…"
 * is dropped, never completed.
 */
export function linkClues(links: string[]): string[] {
  const clues = new Set<string>();
  for (const link of links) {
    const parts = link
      .trim()
      .replace(/^https?:\/\//i, "")
      .split(/[./?=&#]+/);
    parts.forEach((part, index) => {
      const last = index === parts.length - 1;
      if (last && TRUNCATED.test(link.trim())) return;
      const clue = captureKey(part);
      if (clue.length >= MIN_CLUE_KEY && !NOISE.has(clue)) clues.add(clue);
    });
  }
  return [...clues];
}

/** A Linktree username, when the link is written in full. */
export function linktreeSlug(links: string[]): string | null {
  for (const link of links) {
    const match =
      /^(?:https?:\/\/)?(?:www\.)?linktr\.ee\/([A-Za-z0-9._-]+)\/?$/i.exec(
        link.trim(),
      );
    if (match) return match[1];
  }
  return null;
}

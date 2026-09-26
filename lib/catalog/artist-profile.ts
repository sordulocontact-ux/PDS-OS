import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { findArtistsByDeezerIds } from "@/lib/catalog/queries";
import type {
  ArtistBio,
  ArtistProfile,
  ArtistRelease,
} from "@/lib/catalog/types";
import { getDeezerArtist } from "@/lib/integrations/deezer";
import {
  listArtistReleases,
  listRelatedArtists,
  listTopTracks,
} from "@/lib/integrations/deezer-artist";
import { getDeezerBio } from "@/lib/integrations/deezer-bio";
import { getWikipediaSummary } from "@/lib/integrations/wikipedia";
import { todayInParis } from "@/lib/insights/dates";

// Deezer's figures move slowly: one hour of cache spares its rate limit and
// keeps the page fast. A failure is thrown, hence never cached.
const REVALIDATE_SECONDS = 3600;

// Biography: Deezer's internal API first, Wikipedia when it fails or has
// none. Neither answering is not an error: the page just has no biography.
async function loadBio(deezerId: number): Promise<ArtistBio | null> {
  try {
    const bio = await getDeezerBio(deezerId);
    if (bio) {
      const text = htmlToText(bio.html);
      if (text)
        return {
          text,
          source: "deezer",
          author: bio.source,
          url: null,
          lang: "fr",
        };
    }
  } catch (error) {
    console.error("loadBio (deezer):", (error as Error).message);
  }
  try {
    const wiki = await getWikipediaSummary(deezerId);
    return wiki
      ? {
          text: wiki.text,
          source: "wikipedia",
          author: null,
          url: wiki.url,
          lang: wiki.lang,
        }
      : null;
  } catch (error) {
    console.error("loadBio (wikipedia):", (error as Error).message);
    return null;
  }
}

const loadExternal = unstable_cache(
  async (deezerId: number) => {
    const [artist, releases, topTracks, related, bio] = await Promise.all([
      getDeezerArtist(deezerId),
      listArtistReleases(deezerId),
      listTopTracks(deezerId),
      listRelatedArtists(deezerId),
      loadBio(deezerId),
    ]);
    return artist
      ? { fans: artist.fans, releases, topTracks, related, bio }
      : null;
  },
  ["artist-profile"],
  { revalidate: REVALIDATE_SECONDS },
);

/** Null when Deezer is unreachable or no longer knows the profile. */
export const getArtistProfile = cache(
  async (deezerId: number): Promise<ArtistProfile | null> => {
    const external = await loadExternal(deezerId).catch((error: Error) => {
      console.error("getArtistProfile:", error.message);
      return null;
    });
    if (!external) return null;

    const today = todayInParis();
    const releases: ArtistRelease[] = external.releases.map((r) => ({
      ...r,
      upcoming: r.releaseDate !== null && r.releaseDate > today,
    }));
    // Sorted newest first: the first one already out wins.
    const out = releases.filter((r) => r.releaseDate && !r.upcoming);
    const existing = await findArtistsByDeezerIds(
      external.related.map((a) => a.id),
    );

    return {
      fans: external.fans,
      releases,
      latestRelease: out[0] ?? null,
      latestAlbum: out.find((r) => r.kind === "album") ?? null,
      topTracks: external.topTracks,
      related: external.related.map((a) => ({
        deezerId: a.id,
        name: a.name,
        pictureUrl: a.pictureUrl,
        fans: a.fans,
        link: a.link,
        existing: existing.get(a.id) ?? null,
      })),
      bio: external.bio,
    };
  },
);

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// Deezer's biography is HTML from a third party: only its text is kept,
// never rendered as markup. Paragraphs and line breaks become blank lines.
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] !== "#") return ENTITIES[entity.toLowerCase()] ?? match;
      const code =
        entity[1].toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    })
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

import "server-only";

import type { SimilarGroup, SimilarSource } from "@/lib/design/similar-rules";
import {
  arenaSearchReady,
  getArenaImage,
  searchArenaImages,
} from "@/lib/integrations/arena";
import type { ExternalImage } from "@/lib/integrations/images";
import {
  getOpenverseImage,
  searchOpenverseImages,
} from "@/lib/integrations/openverse";
import {
  getTumblrImage,
  searchTumblrImages,
  tumblrReady,
} from "@/lib/integrations/tumblr";
import {
  getUnsplashImage,
  searchUnsplashImages,
  unsplashReady,
} from "@/lib/integrations/unsplash";

// The sources of « Chercher des références semblables », and which are on.
// Unsplash and Tumblr turn on with their key. Are.na and Openverse stay in
// the code, switched off: « Unsplash + Tumblr, et pour le moment tu peux
// laisser de côté Are.na » (Sacha, 11/10/2026).
export const ARENA_ENABLED = false;
const OPENVERSE_ENABLED = false;

const PER_SEARCH = 12;

/** What the window offers: the sources on, whether PO reads, the Are.na link. */
export function similarSetup(): {
  sources: SimilarSource[];
  reads: boolean;
  arenaLink: boolean;
} {
  const sources: SimilarSource[] = [
    ...(unsplashReady() ? (["unsplash"] as const) : []),
    ...(tumblrReady() ? (["tumblr"] as const) : []),
    ...(ARENA_ENABLED ? (["arena"] as const) : []),
    ...(OPENVERSE_ENABLED ? (["openverse"] as const) : []),
  ];
  const reads =
    unsplashReady() ||
    tumblrReady() ||
    OPENVERSE_ENABLED ||
    (ARENA_ENABLED && arenaSearchReady());
  return { sources, reads, arenaLink: ARENA_ENABLED };
}

function group(
  source: SimilarSource,
  label: string,
  images: ExternalImage[],
): SimilarGroup {
  return {
    key: `${source}:${label}`,
    source,
    label,
    images: images.map((image) => ({ ...image, source })),
  };
}

/** One call per search (Unsplash, Are.na Premium, Openverse) and per tag (Tumblr). */
export function wordCalls(words: {
  searches: string[];
  tags: string[];
}): Array<Promise<SimilarGroup>> {
  const by = (
    on: boolean,
    source: SimilarSource,
    list: string[],
    search: (q: string, per: number) => Promise<ExternalImage[]>,
  ) =>
    on
      ? list.map((q) =>
          search(q, PER_SEARCH).then((images) => group(source, q, images)),
        )
      : [];
  return [
    ...by(unsplashReady(), "unsplash", words.searches, searchUnsplashImages),
    ...by(tumblrReady(), "tumblr", words.tags, searchTumblrImages),
    ...by(
      ARENA_ENABLED && arenaSearchReady(),
      "arena",
      words.searches,
      searchArenaImages,
    ),
    ...by(
      OPENVERSE_ENABLED,
      "openverse",
      words.searches,
      searchOpenverseImages,
    ),
  ];
}

/** One image read again at its source, by its id; null when the source is off. */
export function getSimilarImage(
  source: SimilarSource,
  id: string,
): Promise<ExternalImage | null> {
  if (source === "unsplash") return getUnsplashImage(id);
  if (source === "tumblr") return getTumblrImage(id);
  if (source === "arena" && ARENA_ENABLED) return getArenaImage(id);
  if (source === "openverse" && OPENVERSE_ENABLED) return getOpenverseImage(id);
  return Promise.resolve(null);
}

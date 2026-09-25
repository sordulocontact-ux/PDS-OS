import "server-only";

import { getServerEnv } from "@/lib/env";
import { findAlbumUpc, findTrackByIsrc } from "@/lib/integrations/deezer";
import { IntegrationError } from "@/lib/integrations/http";
import { findAppleMusicTrack } from "@/lib/integrations/itunes";
import { findStreamingUrls } from "@/lib/integrations/musicbrainz";
import { resolveLinks } from "@/lib/integrations/odesli";
import { platformOf, type Platform } from "@/lib/release/platforms";

/**
 * Release detection by ISRC. Deterministic code only: the online status and
 * the platform count are facts computed here, never by a model.
 */

export type Source = "deezer" | "itunes" | "musicbrainz" | "odesli";
export type StepStatus = "found" | "empty" | "skipped" | "error";
export type Step = {
  source: Source;
  status: StepStatus;
  detail?: string;
  durationMs: number;
};

export type ReleaseDetection = {
  isrc: string;
  online: boolean;
  track: {
    title: string;
    artist: string;
    album: string;
    releaseDate: string | null;
    coverUrl: string | null;
  } | null;
  links: Array<{ platform: Platform; url: string; source: Source }>;
  smartlinkUrl: string | null;
  steps: Step[];
};

async function step<T>(
  steps: Step[],
  source: Source,
  run: () => Promise<T>,
  isEmpty: (value: T) => boolean,
): Promise<T | null> {
  const startedAt = performance.now();
  const durationMs = () => Math.round(performance.now() - startedAt);
  try {
    const value = await run();
    steps.push({
      source,
      status: isEmpty(value) ? "empty" : "found",
      durationMs: durationMs(),
    });
    return value;
  } catch (error) {
    const detail =
      error instanceof IntegrationError ? error.reason : "unexpected";
    steps.push({ source, status: "error", detail, durationMs: durationMs() });
    return null;
  }
}

export async function detectRelease(isrc: string): Promise<ReleaseDetection> {
  const steps: Step[] = [];
  const links: ReleaseDetection["links"] = [];
  const add = (url: string | null | undefined, source: Source) => {
    const platform = url ? platformOf(url) : null;
    if (url && platform && !links.some((link) => link.platform === platform)) {
      links.push({ platform, url, source });
    }
  };

  // 1. Deezer: the reference catalogue, looked up by ISRC.
  const track = await step(
    steps,
    "deezer",
    () => findTrackByIsrc(isrc),
    (t) => t === null,
  );
  add(track?.link, "deezer");

  // 2. iTunes: through the album UPC, then the track position.
  if (track) {
    const upc = await findAlbumUpc(track.album.id).catch(() => null);
    await step(
      steps,
      "itunes",
      async () =>
        upc
          ? findAppleMusicTrack(upc, {
              track: track.track_position ?? 0,
              disc: track.disk_number ?? 1,
            })
          : null,
      (url) => url === null,
    ).then((url) => add(url, "itunes"));
  } else {
    steps.push({
      source: "itunes",
      status: "skipped",
      detail: "needs_deezer",
      durationMs: 0,
    });
  }

  // 3. MusicBrainz: community links (Spotify, YouTube Music…), by ISRC.
  const urls = await step(
    steps,
    "musicbrainz",
    () => findStreamingUrls(isrc),
    (u) => u.length === 0,
  );
  for (const url of urls ?? []) add(url, "musicbrainz");

  // 4. Odesli: only with a whitelisted key.
  let smartlinkUrl: string | null = null;
  const odesliKey = getServerEnv().ODESLI_API_KEY;
  if (!odesliKey) {
    steps.push({
      source: "odesli",
      status: "skipped",
      detail: "no_key",
      durationMs: 0,
    });
  } else if (links[0]) {
    const result = await step(
      steps,
      "odesli",
      () => resolveLinks(links[0].url, odesliKey),
      (r) => r.urls.length === 0,
    );
    smartlinkUrl = result?.pageUrl ?? null;
    for (const url of result?.urls ?? []) add(url, "odesli");
  }

  return {
    isrc,
    online: links.length > 0,
    track: track
      ? {
          title: track.title,
          artist: track.artist.name,
          album: track.album.title,
          releaseDate: track.release_date ?? null,
          coverUrl: track.album.cover_medium ?? null,
        }
      : null,
    links,
    smartlinkUrl,
    steps,
  };
}

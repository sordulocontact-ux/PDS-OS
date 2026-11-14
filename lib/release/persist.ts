import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  detectRelease,
  detectReleaseByUpc,
  type ReleaseDetection,
} from "@/lib/release/detect";
import type { ReleaseLookup } from "@/lib/release/isrc";
import { platformOf, type Platform } from "@/lib/release/platforms";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Single persistence path for a detection result, shared by the
 * "Vérifier maintenant" action (user client, RLS) and the daily job (service
 * role). The database function validates the payload again and derives the
 * online status and the timestamps.
 */

export type LinkSource = ReleaseDetection["links"][number]["source"] | "manual";
export type DetectionLink = {
  platform: Platform;
  url: string;
  source: LinkSource;
};

export type RecordOutcome =
  | { ok: true; linkCount: number; detected: boolean }
  | { ok: false; error: "detection_failed" | "record_failed" };

/** Detected links, plus the manual Spotify URL when detection found none. */
export function toDetectionLinks(
  detection: Pick<ReleaseDetection, "links">,
  manualSpotifyUrl: string | null,
): DetectionLink[] {
  const links: DetectionLink[] = detection.links.map(
    ({ platform, url, source }) => ({
      platform,
      url,
      source,
    }),
  );
  if (
    manualSpotifyUrl &&
    platformOf(manualSpotifyUrl) === "spotify" &&
    !links.some((link) => link.platform === "spotify")
  ) {
    links.push({
      platform: "spotify",
      url: manualSpotifyUrl,
      source: "manual",
    });
  }
  return links;
}

/** True when every source that was actually queried failed. */
function allSourcesFailed(detection: ReleaseDetection): boolean {
  const queried = detection.steps.filter((step) => step.status !== "skipped");
  return queried.length > 0 && queried.every((step) => step.status === "error");
}

export async function detectAndRecord(
  supabase: SupabaseClient<Database>,
  release: { id: string; lookup: ReleaseLookup; spotifyUrl: string | null },
): Promise<RecordOutcome> {
  // A collective's compilation by its UPC, any other release by its ISRC
  // (lot 13, lib/release/isrc.ts).
  const detection =
    "upc" in release.lookup
      ? await detectReleaseByUpc(release.lookup.upc)
      : await detectRelease(release.lookup.isrc);
  // An outage is not a check: keep the previous state untouched.
  if (allSourcesFailed(detection))
    return { ok: false, error: "detection_failed" };

  const links = toDetectionLinks(detection, release.spotifyUrl);
  const { error } = await supabase.rpc("record_release_detection", {
    p_release_id: release.id,
    p_links: links,
  });
  if (error) {
    console.error("record_release_detection:", error.code, error.message);
    return { ok: false, error: "record_failed" };
  }
  return { ok: true, linkCount: links.length, detected: detection.online };
}

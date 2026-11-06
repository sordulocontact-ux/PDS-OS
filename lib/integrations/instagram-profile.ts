import "server-only";

import { fetchText } from "@/lib/integrations/http";
import { instagramMeta, socialImageUrl } from "@/lib/integrations/social-page";
import { instagramUrl } from "@/lib/network/socials";

/**
 * An Instagram profile as its public page announces it: the name shown and
 * the profile picture (signed link, valid a few days: shown, never stored).
 * No API and no key; null when the page cannot be read or is not that
 * account's (private, absent, login wall).
 */
export type InstagramProfile = {
  displayName: string;
  pictureUrl: string | null;
};

export async function readInstagramProfile(
  handle: string,
): Promise<InstagramProfile | null> {
  let html: string;
  try {
    html = await fetchText("instagram", instagramUrl(handle));
  } catch {
    return null;
  }
  const meta = instagramMeta(html, handle);
  if (!meta) return null;
  return {
    displayName: meta.displayName,
    pictureUrl: socialImageUrl(meta.pictureUrl)?.href ?? null,
  };
}

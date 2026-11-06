import "server-only";

import { fetchText } from "@/lib/integrations/http";
import {
  instagramPicture,
  socialImageUrl,
  tiktokAvatar,
} from "@/lib/integrations/social-page";
import {
  MAX_NETWORK_PICTURE_BYTES,
  NETWORK_PICTURE_EXTENSIONS,
} from "@/lib/network/picture-rules";
import { instagramUrl, tiktokUrl } from "@/lib/network/socials";

/**
 * The picture of a public TikTok or Instagram profile (retour d'Ibé du
 * 01/11/2026). Read from the profile page as any visitor gets it, with the
 * app's own identified client: TikTok writes the avatar in the page's data,
 * Instagram announces it as the page's Open Graph picture. Both links are
 * signed and expire within days, so the file itself is returned, to be
 * copied into the Réseau's bucket. Null when the profile is private, absent
 * or the platform refuses: the contact simply keeps no picture.
 */

export type SocialPicture = { bytes: Uint8Array; type: string };

async function download(url: URL): Promise<SocialPicture | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      // The image host was checked: never followed elsewhere.
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return null;
  }
  const type = response.headers.get("content-type")?.split(";")[0]?.trim();
  if (!response.ok || !type || !NETWORK_PICTURE_EXTENSIONS[type]) {
    await response.body?.cancel();
    return null;
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return bytes.byteLength > 0 && bytes.byteLength <= MAX_NETWORK_PICTURE_BYTES
    ? { bytes, type }
    : null;
}

/** The profile picture behind a handle, or null. */
export async function socialPicture(
  platform: "tiktok" | "instagram",
  handle: string,
): Promise<SocialPicture | null> {
  let html: string;
  try {
    html = await fetchText(
      platform,
      platform === "tiktok" ? tiktokUrl(handle) : instagramUrl(handle),
    );
  } catch {
    return null;
  }
  const found =
    platform === "tiktok" ? tiktokAvatar(html) : instagramPicture(html);
  const url = socialImageUrl(found);
  return url ? download(url) : null;
}

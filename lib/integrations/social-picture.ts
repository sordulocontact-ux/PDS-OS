import "server-only";

import { fetchText } from "@/lib/integrations/http";
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

// Only the platforms' own image hosts are downloaded from.
const IMAGE_HOSTS = [
  /\.tiktokcdn(-[a-z]+)?\.com$/,
  /\.cdninstagram\.com$/,
  /\.fbcdn\.net$/,
];

function imageUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      IMAGE_HOSTS.some((host) => host.test(url.hostname))
      ? url
      : null;
  } catch {
    return null;
  }
}

// "https://…" as written in TikTok's page data.
function unescapeJson(value: string): string {
  return value.replace(/\\u([0-9a-f]{4})/gi, (_, code: string) =>
    String.fromCharCode(parseInt(code, 16)),
  );
}

function tiktokAvatar(html: string): string | null {
  // 720 px is plenty for an avatar; the 1080 px one as a fallback.
  for (const key of ["avatarMedium", "avatarLarger", "avatarThumb"]) {
    const match = new RegExp(`"${key}":"([^"]+)"`).exec(html);
    if (match) return unescapeJson(match[1]);
  }
  return null;
}

function instagramAvatar(html: string): string | null {
  const tag = /<meta[^>]+property="og:image"[^>]*>/i.exec(html)?.[0];
  const content = tag && /content="([^"]+)"/i.exec(tag)?.[1];
  return content ? content.replace(/&amp;/g, "&") : null;
}

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
    platform === "tiktok" ? tiktokAvatar(html) : instagramAvatar(html);
  const url = found ? imageUrl(found) : null;
  return url ? download(url) : null;
}

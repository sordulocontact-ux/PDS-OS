import "server-only";

import { z } from "zod";

import { getDeezerArtist } from "@/lib/integrations/deezer";
import { fetchJson, fetchText } from "@/lib/integrations/http";
import {
  instagramPicture,
  socialImageUrl,
  tiktokAvatar,
} from "@/lib/integrations/social-page";
import {
  MAX_NETWORK_PICTURE_BYTES,
  NETWORK_PICTURE_EXTENSIONS,
  type ProfilePictureSource,
} from "@/lib/network/picture-rules";
import { instagramUrl, spotifyUrl, tiktokUrl } from "@/lib/network/socials";

/**
 * The picture of a public profile: an artist's Spotify (its public oEmbed,
 * no key) or Deezer (its API), else TikTok or Instagram (retour d'Ibé du
 * 01/11/2026; Spotify and Deezer first for an artist, Sacha 06/11/2026).
 * TikTok and Instagram are read from the profile page as any visitor gets
 * it, with the app's own identified client: TikTok writes the avatar in the
 * page's data, Instagram announces it as the page's Open Graph picture.
 * Their links are signed and expire within days, so the file itself is
 * returned to be copied into the Réseau's bucket. Null when the profile is
 * private, absent or the platform refuses: the contact simply keeps no
 * picture.
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

const oembedSchema = z.object({ thumbnail_url: z.string().optional() });

async function pageOf(
  platform: "tiktok" | "instagram",
  handle: string,
): Promise<string | null> {
  try {
    return await fetchText(
      platform,
      platform === "tiktok" ? tiktokUrl(handle) : instagramUrl(handle),
    );
  } catch {
    return null;
  }
}

async function pictureAddress(
  source: ProfilePictureSource,
  account: string,
): Promise<string | null> {
  switch (source) {
    case "spotify": {
      const oembed = new URL("https://open.spotify.com/oembed");
      oembed.searchParams.set("url", spotifyUrl(account));
      const parsed = oembedSchema.safeParse(await fetchJson("spotify", oembed));
      return parsed.success ? (parsed.data.thumbnail_url ?? null) : null;
    }
    case "deezer":
      return /^\d{1,12}$/.test(account)
        ? ((await getDeezerArtist(Number(account)))?.pictureBig ?? null)
        : null;
    case "tiktok":
    case "instagram": {
      const html = await pageOf(source, account);
      if (!html) return null;
      return source === "tiktok" ? tiktokAvatar(html) : instagramPicture(html);
    }
  }
}

/**
 * The address of a profile's picture (Spotify artist id, Deezer artist id,
 * TikTok or Instagram handle), on the platform's own image host; null when
 * there is none or the platform does not answer.
 */
export async function profilePictureUrl(
  source: ProfilePictureSource,
  account: string,
): Promise<string | null> {
  const found = await pictureAddress(source, account).catch(() => null);
  return socialImageUrl(found)?.href ?? null;
}

/** The picture file of a profile, or null. */
export async function profilePicture(
  source: ProfilePictureSource,
  account: string,
): Promise<SocialPicture | null> {
  const url = await profilePictureUrl(source, account);
  return url ? download(new URL(url)) : null;
}

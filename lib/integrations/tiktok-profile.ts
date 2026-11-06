import "server-only";

import { z } from "zod";

import { fetchText, IntegrationError } from "@/lib/integrations/http";
import { socialImageUrl, tiktokAvatar } from "@/lib/integrations/social-page";
import { asHandle } from "@/lib/network/socials";

/**
 * A TikTok profile as its public page shows it: display name, bio, bio link,
 * audience. No API and no key: the page embeds its data as JSON
 * (`__UNIVERSAL_DATA_FOR_REHYDRATION__`), an undocumented format that may
 * change; any surprise answers `undefined` and the caller falls back on the
 * official oEmbed. The bio is data, read by the code only, never sent to a
 * model.
 */

export type TikTokProfile = {
  handle: string;
  displayName: string;
  bio: string;
  bioLink: string | null;
  followers: number | null;
  videos: number | null;
  verified: boolean;
  // Signed link, valid a few days: shown, never stored.
  avatar: string | null;
};

const count = z.coerce.number().int().nonnegative().nullish();

const dataSchema = z.object({
  __DEFAULT_SCOPE__: z.object({
    "webapp.user-detail": z.object({
      statusCode: z.number(),
      userInfo: z
        .object({
          user: z.object({
            uniqueId: z.string(),
            nickname: z.string().nullish(),
            signature: z.string().nullish(),
            verified: z.boolean().nullish(),
            bioLink: z.object({ link: z.string() }).nullish(),
          }),
          stats: z
            .object({ followerCount: count, videoCount: count })
            .nullish(),
        })
        .nullish(),
    }),
  }),
});

const DATA =
  /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/;

// TikTok answers 10221 for a username that does not exist.
const NOT_FOUND = 10221;

/**
 * The profile behind a handle; null when TikTok has none (a misread
 * handle); `undefined` when the page could not be read.
 */
export async function readTikTokProfile(
  handle: string,
): Promise<TikTokProfile | null | undefined> {
  let html: string;
  try {
    html = await fetchText(
      "tiktok",
      `https://www.tiktok.com/@${encodeURIComponent(handle)}`,
    );
  } catch (error) {
    if (error instanceof IntegrationError && error.reason === "http_404")
      return null;
    return undefined;
  }
  const json = DATA.exec(html)?.[1];
  if (!json) return undefined;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return undefined;
  }
  const parsed = dataSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  const detail = parsed.data.__DEFAULT_SCOPE__["webapp.user-detail"];
  if (detail.statusCode === NOT_FOUND) return null;
  const info = detail.userInfo;
  const confirmed = asHandle(info?.user.uniqueId);
  if (detail.statusCode !== 0 || !info || !confirmed) return undefined;
  const link = info.user.bioLink?.link.trim() ?? "";
  return {
    handle: confirmed,
    displayName: info.user.nickname?.trim() ?? "",
    bio: info.user.signature?.trim() ?? "",
    bioLink: /^https?:\/\//i.test(link)
      ? link
      : link
        ? `https://${link}`
        : null,
    followers: info.stats?.followerCount ?? null,
    videos: info.stats?.videoCount ?? null,
    verified: info.user.verified ?? false,
    avatar: socialImageUrl(tiktokAvatar(html))?.href ?? null,
  };
}

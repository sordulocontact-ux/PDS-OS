import "server-only";

import { z } from "zod";

import type { StatsLink, StatsPlatform } from "@/lib/activations/stats-links";
import { getServerEnv } from "@/lib/env";
import {
  googleAccessToken,
  googleHasScope,
  googleSettings,
} from "@/lib/integrations/google-oauth";
import { fetchJson, fetchText } from "@/lib/integrations/http";

/**
 * The public statistics of a published link, read by code at the moment of
 * the read (Sacha 10/11/2026). Each platform by its most official door
 * (docs/CONTEXTE-PROJET.md § 6, six levels):
 * - YouTube: the Data API v3, with its own key (YOUTUBE_API_KEY) or po@'s
 *   Google token granted YouTube (youtubeAuth);
 * - Deezer: its public API, no key;
 * - TikTok: no public API for a video's figures; its public page embeds them
 *   as JSON, read without a login like the profiles of the Labo
 *   (tiktok-profile.ts), an undocumented format that may change.
 * A figure the platform does not give (likes hidden on YouTube) is absent,
 * never a zero; anything unexpected makes the whole read fail.
 */

export type PostFigures = Partial<
  Record<
    "views" | "likes" | "comments" | "shares" | "saves" | "followers",
    number
  >
>;

export type PostStats = {
  platform: StatsPlatform;
  // A stable link to the post, whatever form was declared.
  canonical: string;
  // Its publication day (Paris), when the platform says it.
  publishedOn: string | null;
  figures: PostFigures;
};

export type PostStatsRead =
  | { ok: true; stats: PostStats }
  | { ok: false; reason: "unreadable" | "not_found" | "no_key" };

const count = z.coerce.number().int().nonnegative();

const parisDay = (date: Date) =>
  date.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

/** Only the figures actually given. */
function figures(values: Record<keyof PostFigures, unknown>): PostFigures {
  const out: PostFigures = {};
  for (const [key, value] of Object.entries(values)) {
    const parsed = count.safeParse(value);
    if (value !== undefined && value !== null && parsed.success)
      out[key as keyof PostFigures] = parsed.data;
  }
  return out;
}

// ── TikTok ─────────────────────────────────────────────────────────────────

const DATA =
  /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/;

const tiktokStats = z
  .object({
    playCount: z.unknown(),
    diggCount: z.unknown(),
    commentCount: z.unknown(),
    shareCount: z.unknown(),
    collectCount: z.unknown(),
  })
  .partial();

const tiktokSchema = z.object({
  __DEFAULT_SCOPE__: z.object({
    "webapp.video-detail": z.object({
      statusCode: z.number(),
      itemInfo: z
        .object({
          itemStruct: z.object({
            id: z.string(),
            createTime: z.coerce.number().nullish(),
            author: z.object({ uniqueId: z.string() }).nullish(),
            stats: tiktokStats.nullish(),
            // Exact figures as strings; `stats` may round.
            statsV2: tiktokStats.nullish(),
          }),
        })
        .nullish(),
    }),
  }),
});

async function readTikTok(link: StatsLink): Promise<PostStatsRead> {
  let html: string;
  try {
    // A short link (vm.tiktok.com) is followed to the video's page.
    html = await fetchText("tiktok", link.url);
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  const json = DATA.exec(html)?.[1];
  if (!json) return { ok: false, reason: "unreadable" };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  const parsed = tiktokSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "unreadable" };
  const detail = parsed.data.__DEFAULT_SCOPE__["webapp.video-detail"];
  const item = detail.itemInfo?.itemStruct;
  if (detail.statusCode !== 0 || !item)
    return { ok: false, reason: "not_found" };
  const s = { ...item.stats, ...item.statsV2 };
  const read = figures({
    views: s.playCount,
    likes: s.diggCount,
    comments: s.commentCount,
    shares: s.shareCount,
    saves: s.collectCount,
    followers: undefined,
  });
  if (Object.keys(read).length === 0)
    return { ok: false, reason: "unreadable" };
  const author = item.author?.uniqueId;
  return {
    ok: true,
    stats: {
      platform: "tiktok",
      canonical: author
        ? `https://www.tiktok.com/@${author}/video/${item.id}`
        : `https://www.tiktok.com/video/${item.id}`,
      publishedOn: item.createTime
        ? parisDay(new Date(item.createTime * 1000))
        : null,
      figures: read,
    },
  };
}

// ── YouTube ────────────────────────────────────────────────────────────────

const youtubeSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      snippet: z.object({ publishedAt: z.string().nullish() }).nullish(),
      statistics: z
        .object({
          viewCount: z.unknown(),
          likeCount: z.unknown(),
          commentCount: z.unknown(),
        })
        .partial(),
    }),
  ),
});

// po@'s Google token reads YouTube once it was granted this scope
// (scripts/google-calendar-token.mjs).
const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

/**
 * How PDS OS calls YouTube (Sacha 10/11/2026: « branche YouTube avec le
 * jeton PDS OS, une clé séparée plus tard »): its own key when
 * YOUTUBE_API_KEY is set, else the organizer's Google token (po@) if it was
 * granted YouTube, else nothing. Both read any public video of any channel.
 */
async function youtubeAuth(): Promise<
  { key: string } | { bearer: string } | null
> {
  const key = getServerEnv().YOUTUBE_API_KEY;
  if (key) return { key };
  const config = googleSettings();
  if (!config || !(await googleHasScope(YOUTUBE_SCOPE))) return null;
  try {
    return { bearer: await googleAccessToken(config) };
  } catch {
    return null;
  }
}

async function readYouTube(link: StatsLink): Promise<PostStatsRead> {
  if (!link.id) return { ok: false, reason: "unreadable" };
  const auth = await youtubeAuth();
  if (!auth) return { ok: false, reason: "no_key" };
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "statistics,snippet");
  url.searchParams.set("id", link.id);
  if ("key" in auth) url.searchParams.set("key", auth.key);
  let raw: unknown;
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...("bearer" in auth ? { authorization: `Bearer ${auth.bearer}` } : {}),
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { ok: false, reason: "unreadable" };
    raw = await response.json();
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  const parsed = youtubeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "unreadable" };
  const video = parsed.data.items[0];
  if (!video) return { ok: false, reason: "not_found" };
  const published = video.snippet?.publishedAt;
  return {
    ok: true,
    stats: {
      platform: "youtube",
      canonical: `https://www.youtube.com/watch?v=${video.id}`,
      publishedOn: published ? parisDay(new Date(published)) : null,
      figures: figures({
        views: video.statistics.viewCount,
        likes: video.statistics.likeCount,
        comments: video.statistics.commentCount,
        shares: undefined,
        saves: undefined,
        followers: undefined,
      }),
    },
  };
}

// ── Deezer ─────────────────────────────────────────────────────────────────

const deezerSchema = z.union([
  z.object({ id: z.coerce.number(), fans: z.unknown() }),
  z.object({ error: z.unknown() }),
]);

async function readDeezer(link: StatsLink): Promise<PostStatsRead> {
  if (!link.id) return { ok: false, reason: "unreadable" };
  let raw: unknown;
  try {
    raw = await fetchJson(
      "deezer",
      `https://api.deezer.com/playlist/${link.id}`,
    );
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  const parsed = deezerSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "unreadable" };
  if ("error" in parsed.data) return { ok: false, reason: "not_found" };
  return {
    ok: true,
    stats: {
      platform: "deezer",
      canonical: `https://www.deezer.com/playlist/${parsed.data.id}`,
      publishedOn: null,
      figures: figures({
        followers: parsed.data.fans,
        views: undefined,
        likes: undefined,
        comments: undefined,
        shares: undefined,
        saves: undefined,
      }),
    },
  };
}

const READERS: Record<
  StatsPlatform,
  (link: StatsLink) => Promise<PostStatsRead>
> = { tiktok: readTikTok, youtube: readYouTube, deezer: readDeezer };

export function readPostStats(link: StatsLink): Promise<PostStatsRead> {
  return READERS[link.platform](link);
}

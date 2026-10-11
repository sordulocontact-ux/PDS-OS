import "server-only";

import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { IntegrationError } from "@/lib/integrations/http";
import {
  IMAGE_USER_AGENT,
  httpsUrl,
  type ExternalImage,
} from "@/lib/integrations/images";

/**
 * Single entry point to Are.na (CLAUDE.md, rule 2). Free public reads, no
 * token: a block, the channels a block was saved in, a channel's contents —
 * similar images are found « by rebound », in the channels people filled
 * with the same image. The search by words (/v3/search) is for Premium
 * accounts only (the old v2 API blocks automated access): it runs only with
 * ARENA_TOKEN, a Premium account's personal token, never sent to the browser.
 * API v3: https://www.are.na/developers/explore
 */

const API = "https://api.are.na/v3";

export type ArenaChannel = { id: number; title: string };

/** A Premium token is set: Are.na can be searched by words. */
export function arenaSearchReady(): boolean {
  return Boolean(getServerEnv().ARENA_TOKEN);
}

async function call(path: string, token?: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": IMAGE_USER_AGENT,
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new IntegrationError("arena", "unreachable");
  }
  if (response.status === 404) return null;
  if (response.status === 401)
    throw new IntegrationError("arena", "unauthorized");
  if (response.status === 403)
    throw new IntegrationError("arena", "premium_required");
  if (response.status === 429)
    throw new IntegrationError("arena", "rate_limited");
  if (!response.ok)
    throw new IntegrationError("arena", `http_${response.status}`);
  return response.json();
}

const version = z.object({ src: z.string() }).partial().nullish();
const imageBlock = z.object({
  id: z.number().int().positive(),
  type: z.string(),
  title: z.string().nullish(),
  image: z
    .object({
      src: z.string().nullish(),
      filename: z.string().nullish(),
      medium: version,
      large: version,
    })
    .nullish(),
  user: z.object({ name: z.string().nullish() }).nullish(),
});

function toImage(raw: unknown): ExternalImage | null {
  const parsed = imageBlock.safeParse(raw);
  if (!parsed.success) return null;
  const b = parsed.data;
  if (b.type !== "Image" || !b.image) return null;
  // « large » is a display size (1800 px); the original only if it is missing.
  const large = b.image.large?.src;
  const original = b.image.src;
  const fileUrl = httpsUrl(large)
    ? large
    : httpsUrl(original)
      ? original
      : null;
  const medium = b.image.medium?.src;
  const thumbnail = httpsUrl(medium) ? medium : fileUrl;
  if (!fileUrl || !thumbnail) return null;
  return {
    id: String(b.id),
    title: b.title?.trim() || null,
    thumbnail,
    fileUrl,
    fallbackUrl: httpsUrl(medium) && medium !== fileUrl ? medium : null,
    fileName: b.image.filename?.trim() || null,
    pageUrl: `https://www.are.na/block/${b.id}`,
    author: b.user?.name?.trim() || null,
    license: null,
  };
}

const channel = z.object({
  id: z.number().int().positive(),
  type: z.literal("Channel"),
  title: z.string(),
  visibility: z.string().nullish(),
});

function toChannel(raw: unknown): ArenaChannel | null {
  const parsed = channel.safeParse(raw);
  if (!parsed.success || parsed.data.visibility === "private") return null;
  return { id: parsed.data.id, title: parsed.data.title.trim() };
}

const list = (body: unknown): unknown[] => {
  const data = (body as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? data : [];
};

/** One image block, read by its id; null when it is gone or not an image. */
export async function getArenaImage(id: string): Promise<ExternalImage | null> {
  if (!/^\d{1,12}$/.test(id)) return null;
  return toImage(await call(`/blocks/${id}`));
}

/** The public channels a block was saved in, most recent first. */
export async function arenaChannelsOf(
  blockId: string,
  per: number,
): Promise<ArenaChannel[]> {
  if (!/^\d{1,12}$/.test(blockId)) return [];
  const body = await call(`/blocks/${blockId}/connections?per=${per}`);
  return list(body).flatMap((raw) => toChannel(raw) ?? []);
}

/** A channel by its id or its slug (the end of its address). */
export async function getArenaChannel(
  idOrSlug: string,
): Promise<ArenaChannel | null> {
  if (!/^[a-z0-9-]{1,120}$/i.test(idOrSlug)) return null;
  return toChannel(await call(`/channels/${idOrSlug}`));
}

/** The images of a channel (its texts and links left aside). */
export async function arenaChannelImages(
  channelId: number,
): Promise<ExternalImage[]> {
  const body = await call(`/channels/${channelId}/contents?per=100`);
  return list(body).flatMap((raw) => toImage(raw) ?? []);
}

/** Premium only: the image blocks Are.na finds for these words. */
export async function searchArenaImages(
  query: string,
  per: number,
): Promise<ExternalImage[]> {
  const { ARENA_TOKEN } = getServerEnv();
  if (!ARENA_TOKEN) throw new IntegrationError("arena", "not_configured");
  const params = new URLSearchParams({
    query,
    type: "Image",
    per: String(per),
  });
  return list(await call(`/search?${params}`, ARENA_TOKEN)).flatMap(
    (raw) => toImage(raw) ?? [],
  );
}

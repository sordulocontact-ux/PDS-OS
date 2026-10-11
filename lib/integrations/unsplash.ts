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
 * Single entry point to Unsplash (CLAUDE.md, rule 2): photos found by
 * words, one photo read again by its id, and the download ping its rules
 * ask for when a photo is kept. Server-side only, with the application's
 * access key (UNSPLASH_ACCESS_KEY, free: 50 calls an hour in demo, more
 * once Unsplash approves the application). Proposals are shown from
 * Unsplash's own image addresses (its « hotlinking » rule); the photographer
 * and Unsplash are credited. https://unsplash.com/documentation
 */

const API = "https://api.unsplash.com";
// Links back to Unsplash carry the application's name (its guidelines).
const REFERRAL = "utm_source=pds_os&utm_medium=referral";

export function unsplashReady(): boolean {
  return Boolean(getServerEnv().UNSPLASH_ACCESS_KEY);
}

async function call(path: string): Promise<unknown> {
  const { UNSPLASH_ACCESS_KEY } = getServerEnv();
  if (!UNSPLASH_ACCESS_KEY)
    throw new IntegrationError("unsplash", "not_configured");
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      cache: "no-store",
      headers: {
        authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        "accept-version": "v1",
        accept: "application/json",
        "user-agent": IMAGE_USER_AGENT,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new IntegrationError("unsplash", "unreachable");
  }
  if (response.status === 404) return null;
  if (response.status === 401)
    throw new IntegrationError("unsplash", "unauthorized");
  // Unsplash answers 403 « Rate Limit Exceeded » when the hour is used up.
  if (response.status === 403 || response.status === 429)
    throw new IntegrationError("unsplash", "rate_limited");
  if (!response.ok)
    throw new IntegrationError("unsplash", `http_${response.status}`);
  return response.json();
}

const photo = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
  description: z.string().nullish(),
  alt_description: z.string().nullish(),
  urls: z.object({
    regular: z.string().nullish(),
    small: z.string().nullish(),
  }),
  links: z.object({ download_location: z.string().nullish() }).nullish(),
  user: z.object({ name: z.string().nullish() }).nullish(),
});

function toImage(raw: unknown): ExternalImage | null {
  const parsed = photo.safeParse(raw);
  if (!parsed.success) return null;
  const p = parsed.data;
  const { regular, small } = p.urls;
  if (!httpsUrl(regular) || !httpsUrl(small)) return null;
  const ping = p.links?.download_location;
  const title = (p.description ?? p.alt_description)?.trim() || null;
  return {
    id: p.id,
    title: title ? title.slice(0, 200) : null,
    thumbnail: small,
    // « regular » is 1080 px wide: enough for a moodboard.
    fileUrl: regular,
    fallbackUrl: small,
    fileName: `unsplash-${p.id}.jpg`,
    pageUrl: `https://unsplash.com/photos/${p.id}?${REFERRAL}`,
    author: p.user?.name?.trim() || null,
    license: "Licence Unsplash",
    ...(httpsUrl(ping) ? { downloadPing: ping } : {}),
  };
}

/** The photos Unsplash finds for these words, most relevant first. */
export async function searchUnsplashImages(
  query: string,
  per: number,
): Promise<ExternalImage[]> {
  const params = new URLSearchParams({
    query,
    per_page: String(Math.min(per, 30)),
    content_filter: "high",
  });
  const body = (await call(`/search/photos?${params}`)) as {
    results?: unknown;
  } | null;
  const results = Array.isArray(body?.results) ? body.results : [];
  return results.flatMap((raw) => toImage(raw) ?? []);
}

/** One photo read again by its id: what a kept proposal stores. */
export async function getUnsplashImage(
  id: string,
): Promise<ExternalImage | null> {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return null;
  return toImage(await call(`/photos/${id}`));
}

/** Tells Unsplash a photo was kept (its rules); a failure changes nothing. */
export async function pingUnsplashDownload(url: string): Promise<void> {
  if (!url.startsWith(`${API}/`)) return;
  try {
    await call(url.slice(API.length));
  } catch (error) {
    console.error("[unsplash] download ping failed:", error);
  }
}

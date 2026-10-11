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
 * Single entry point to Openverse (CLAUDE.md, rule 2): openly licensed
 * images (Creative Commons, public domain) found by words, and one image
 * read again by its id. Free, without an account: 200 searches a day per
 * address, shared on Vercel's servers. OPENVERSE_CLIENT_ID / _SECRET
 * (free, optional) raise the limit with an application token.
 * API: https://api.openverse.org/v1/
 */

const API = "https://api.openverse.org/v1";

// The application token, kept until shortly before it expires.
let token: { value: string; until: number } | null = null;

async function bearer(): Promise<string | null> {
  const { OPENVERSE_CLIENT_ID: id, OPENVERSE_CLIENT_SECRET: secret } =
    getServerEnv();
  if (!id || !secret) return null;
  if (token && token.until > Date.now()) return token.value;
  try {
    const response = await fetch(`${API}/auth_tokens/token/`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": IMAGE_USER_AGENT,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: id,
        client_secret: secret,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!response.ok || !body.access_token) throw new Error();
    token = {
      value: body.access_token,
      until: Date.now() + Math.max(60, (body.expires_in ?? 3600) - 300) * 1000,
    };
    return token.value;
  } catch {
    // A refused application still searches anonymously.
    console.error("[openverse] application token refused");
    return null;
  }
}

async function call(path: string): Promise<unknown> {
  const auth = await bearer();
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": IMAGE_USER_AGENT,
        ...(auth ? { authorization: `Bearer ${auth}` } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new IntegrationError("openverse", "unreachable");
  }
  if (response.status === 404) return null;
  if (response.status === 429)
    throw new IntegrationError("openverse", "rate_limited");
  if (!response.ok)
    throw new IntegrationError("openverse", `http_${response.status}`);
  return response.json();
}

const result = z.object({
  id: z.uuid(),
  title: z.string().nullish(),
  url: z.string().nullish(),
  thumbnail: z.string().nullish(),
  creator: z.string().nullish(),
  license: z.string().nullish(),
  license_version: z.string().nullish(),
});

/** « CC BY-SA 2.0 », « CC0 », « Domaine public ». */
function licenseLabel(license: string, version: string | null | undefined) {
  if (license === "pdm") return "Domaine public";
  if (license === "cc0") return "CC0";
  return `CC ${license.toUpperCase()}${version ? ` ${version}` : ""}`;
}

function toImage(raw: unknown): ExternalImage | null {
  const parsed = result.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;
  if (!httpsUrl(r.url) || !httpsUrl(r.thumbnail)) return null;
  return {
    id: r.id,
    title: r.title?.trim() || null,
    thumbnail: r.thumbnail,
    fileUrl: r.url,
    // Openverse's own copy (a few hundred pixels) when the original is huge.
    fallbackUrl: r.thumbnail,
    fileName: null,
    pageUrl: `https://openverse.org/image/${r.id}`,
    author: r.creator?.trim() || null,
    license: r.license ? licenseLabel(r.license, r.license_version) : null,
  };
}

/** The images Openverse finds for these words, most relevant first. */
export async function searchOpenverseImages(
  query: string,
  per: number,
): Promise<ExternalImage[]> {
  const params = new URLSearchParams({
    q: query,
    page_size: String(Math.min(per, 20)),
    extension: "jpg,jpeg,png,webp,gif",
    mature: "false",
  });
  const body = (await call(`/images/?${params}`)) as {
    results?: unknown;
  } | null;
  const results = Array.isArray(body?.results) ? body.results : [];
  return results.flatMap((raw) => toImage(raw) ?? []);
}

/** One image read again by its id: what a kept proposal stores. */
export async function getOpenverseImage(
  id: string,
): Promise<ExternalImage | null> {
  if (!z.uuid().safeParse(id).success) return null;
  return toImage(await call(`/images/${id}/`));
}

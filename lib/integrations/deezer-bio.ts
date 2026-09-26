import "server-only";

import { z } from "zod";

import { IntegrationError } from "@/lib/integrations/http";

/**
 * Artist biography from Deezer's INTERNAL web API (`gw-light.php`, the one
 * deezer.com itself calls). The public API has no biography route.
 *
 * Unofficial and undocumented: Deezer may change or block it at any time,
 * and its use is not covered by the public API terms. Kept isolated here so
 * it can be unplugged alone; every failure throws, and the caller falls back
 * to Wikipedia (`lib/catalog/artist-profile.ts`). Two calls: an anonymous
 * session (CSRF token + cookies), then the artist page.
 */

const GW = "https://www.deezer.com/ajax/gw-light.php";
const USER_AGENT = "PDS-OS/0.1 (internal release tracker)";

export type DeezerBio = { html: string; source: string | null };

async function call(
  method: string,
  token: string,
  init: { cookie?: string; body?: unknown } = {},
): Promise<Response> {
  const url = new URL(GW);
  url.searchParams.set("method", method);
  url.searchParams.set("input", "3");
  url.searchParams.set("api_version", "1.0");
  url.searchParams.set("api_token", token);
  try {
    return await fetch(url, {
      method: init.body === undefined ? "GET" : "POST",
      cache: "no-store",
      headers: {
        "user-agent": USER_AGENT,
        "content-type": "application/json",
        ...(init.cookie ? { cookie: init.cookie } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new IntegrationError("deezer-gw", "unreachable");
  }
}

const sessionSchema = z.object({
  results: z.object({ checkForm: z.string().min(1) }),
});

// BIO is `false` when Deezer has no biography for the artist.
const pageSchema = z.object({
  results: z.object({
    BIO: z.union([
      z.literal(false),
      z.object({ BIO: z.string(), SOURCE: z.string().optional() }),
    ]),
  }),
});

/** Null when Deezer has no biography; throws when the API misbehaves. */
export async function getDeezerBio(
  deezerId: number,
): Promise<DeezerBio | null> {
  const session = await call("deezer.getUserData", "");
  const parsedSession = sessionSchema.safeParse(
    await session.json().catch(() => null),
  );
  if (!session.ok || !parsedSession.success)
    throw new IntegrationError("deezer-gw", "no_session");
  const cookie = session.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  const page = await call(
    "deezer.pageArtist",
    parsedSession.data.results.checkForm,
    { cookie, body: { art_id: String(deezerId), lang: "fr", tab: 0 } },
  );
  const parsed = pageSchema.safeParse(await page.json().catch(() => null));
  if (!page.ok || !parsed.success)
    throw new IntegrationError("deezer-gw", "unexpected_page");
  const bio = parsed.data.results.BIO;
  if (bio === false || bio.BIO.trim() === "") return null;
  return { html: bio.BIO, source: bio.SOURCE?.trim() || null };
}

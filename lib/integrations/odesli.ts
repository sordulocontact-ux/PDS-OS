import "server-only";

import { z } from "zod";

import { fetchJson } from "@/lib/integrations/http";

/**
 * Odesli / Songlink. The public API answers 401 PUBLIC_API_ACCESS_DEPRECATED
 * without a key (checked 2026-09-25); keys are granted through a whitelist
 * form. Without ODESLI_API_KEY this step is skipped.
 */

const schema = z.object({
  pageUrl: z.url().optional(),
  linksByPlatform: z.record(z.string(), z.object({ url: z.url() })).optional(),
});

export type OdesliResult = { pageUrl: string | null; urls: string[] };

export async function resolveLinks(
  sourceUrl: string,
  apiKey: string,
): Promise<OdesliResult> {
  const url = new URL("https://api.song.link/v1-alpha.1/links");
  url.search = new URLSearchParams({
    url: sourceUrl,
    userCountry: "FR",
    key: apiKey,
  }).toString();

  const parsed = schema.safeParse(await fetchJson("odesli", url));
  if (!parsed.success) return { pageUrl: null, urls: [] };

  return {
    pageUrl: parsed.data.pageUrl ?? null,
    urls: Object.values(parsed.data.linksByPlatform ?? {}).map(
      (link) => link.url,
    ),
  };
}

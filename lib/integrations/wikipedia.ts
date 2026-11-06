import "server-only";

import { z } from "zod";

import { fetchJson } from "@/lib/integrations/http";

/**
 * Artist summary from Wikipedia, found through Wikidata's "Deezer artist ID"
 * property (P2722): never by name, so a homonym cannot be picked. No key.
 * French article first, English otherwise. Content under CC BY-SA: the page
 * must credit Wikipedia and link to the article.
 */

const WIKIDATA = "https://www.wikidata.org/w/api.php";
const LANGS = ["fr", "en"] as const;

export type WikipediaSummary = {
  text: string;
  url: string;
  lang: (typeof LANGS)[number];
};

const searchSchema = z.object({
  query: z.object({
    search: z.array(z.object({ title: z.string().regex(/^Q\d+$/) })),
  }),
});

const sitelinksSchema = z.object({
  entities: z.record(
    z.string(),
    z.object({
      sitelinks: z
        .record(z.string(), z.object({ title: z.string() }))
        .optional(),
    }),
  ),
});

const summarySchema = z.object({
  type: z.string(),
  extract: z.string(),
  content_urls: z.object({ desktop: z.object({ page: z.url() }) }),
});

export function wikidataItem(deezerId: number): Promise<string | null> {
  return wikidataItemWith("P2722", String(deezerId));
}

/**
 * The one Wikidata item holding `value` for `property` (P2722 Deezer artist
 * id, P2003 Instagram username, P7085 TikTok username); null when none or
 * several claim it.
 */
export async function wikidataItemWith(
  property: string,
  value: string,
): Promise<string | null> {
  const url = new URL(WIKIDATA);
  url.search = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: `haswbstatement:${property}=${value}`,
    srprop: "",
    format: "json",
  }).toString();
  const parsed = searchSchema.safeParse(await fetchJson("wikidata", url));
  // Several items claiming the same value: ambiguous, better nothing.
  if (!parsed.success || parsed.data.query.search.length !== 1) return null;
  return parsed.data.query.search[0].title;
}

/** Null when no article is linked to this Deezer profile. */
export async function getWikipediaSummary(
  deezerId: number,
): Promise<WikipediaSummary | null> {
  const item = await wikidataItem(deezerId);
  if (!item) return null;

  const url = new URL(WIKIDATA);
  url.search = new URLSearchParams({
    action: "wbgetentities",
    ids: item,
    props: "sitelinks",
    sitefilter: LANGS.map((l) => `${l}wiki`).join("|"),
    format: "json",
  }).toString();
  const parsed = sitelinksSchema.safeParse(await fetchJson("wikidata", url));
  const sitelinks = parsed.success
    ? parsed.data.entities[item]?.sitelinks
    : undefined;
  if (!sitelinks) return null;

  for (const lang of LANGS) {
    const title = sitelinks[`${lang}wiki`]?.title;
    if (!title) continue;
    const summary = summarySchema.safeParse(
      await fetchJson(
        "wikipedia",
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replaceAll(" ", "_"))}`,
      ),
    );
    // A disambiguation page is not a biography.
    if (!summary.success || summary.data.type !== "standard") continue;
    const text = summary.data.extract.trim();
    if (text)
      return { text, url: summary.data.content_urls.desktop.page, lang };
  }
  return null;
}

import "server-only";

import { z } from "zod";

import {
  socialsFromUrls,
  type SocialHandles,
} from "@/lib/integrations/artist-socials";
import { fetchText } from "@/lib/integrations/http";

/**
 * The networks an artist lists on their public Linktree page. No API: the
 * page embeds its data as JSON (`__NEXT_DATA__`, `socialLinks`), an
 * undocumented format that may change; any surprise answers nothing.
 */

const pageSchema = z.object({
  props: z.object({
    pageProps: z.object({
      socialLinks: z.array(z.object({ url: z.string() })).optional(),
      links: z.array(z.object({ url: z.string().nullish() })).optional(),
    }),
  }),
});

const DATA = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

export async function linktreeSocials(
  slug: string,
): Promise<SocialHandles | null> {
  const html = await fetchText(
    "linktree",
    `https://linktr.ee/${encodeURIComponent(slug)}`,
  );
  const json = DATA.exec(html)?.[1];
  if (!json) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const parsed = pageSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { socialLinks = [], links = [] } = parsed.data.props.pageProps;
  return socialsFromUrls([
    ...socialLinks.map((l) => l.url),
    ...links.flatMap((l) => l.url ?? []),
  ]);
}

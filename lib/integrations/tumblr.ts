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
 * Single entry point to Tumblr (CLAUDE.md, rule 2): the images of the posts
 * carrying a tag (/v2/tagged), and one post read again by its blog and id.
 * Server-side only, with the application's consumer key (TUMBLR_API_KEY,
 * free: 1,000 calls an hour, 5,000 a day). The images belong to their
 * authors: references to look at, never to publish.
 * https://github.com/tumblr/docs/blob/master/api.md
 */

const API = "https://api.tumblr.com/v2";
// A post is « <blog>:<post id>:<image index> » in the app.
const BLOG = /^[a-z0-9-]{1,64}$/i;
const POST = /^\d{1,20}$/;
const IMAGES_PER_POST = 3;

export function tumblrReady(): boolean {
  return Boolean(getServerEnv().TUMBLR_API_KEY);
}

async function call(path: string, params: URLSearchParams): Promise<unknown> {
  const { TUMBLR_API_KEY } = getServerEnv();
  if (!TUMBLR_API_KEY) throw new IntegrationError("tumblr", "not_configured");
  params.set("api_key", TUMBLR_API_KEY);
  let response: Response;
  try {
    response = await fetch(`${API}${path}?${params}`, {
      cache: "no-store",
      headers: { accept: "application/json", "user-agent": IMAGE_USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new IntegrationError("tumblr", "unreachable");
  }
  if (response.status === 404) return null;
  if (response.status === 401)
    throw new IntegrationError("tumblr", "unauthorized");
  if (response.status === 429)
    throw new IntegrationError("tumblr", "rate_limited");
  if (!response.ok)
    throw new IntegrationError("tumblr", `http_${response.status}`);
  return ((await response.json()) as { response?: unknown }).response ?? null;
}

const size = z.object({ url: z.string(), width: z.number().nullish() });
const post = z.object({
  blog_name: z.string().regex(BLOG),
  id_string: z.string().regex(POST),
  summary: z.string().nullish(),
  // Legacy photo posts: each photo in several sizes, largest first.
  photos: z
    .array(
      z.object({
        original_size: size.nullish(),
        alt_sizes: z.array(size).nullish(),
      }),
    )
    .nullish(),
  // Posts written in the new format come back as HTML with <img> tags.
  body: z.string().nullish(),
});

const MEDIA = /^https:\/\/[a-z0-9-]+\.media\.tumblr\.com\//;
const IMG_SRC =
  /<img[^>]+src="(https:\/\/[a-z0-9-]+\.media\.tumblr\.com\/[^"]+)"/g;

/** The file and a lighter version of each image of a post. */
function imagesOf(p: z.infer<typeof post>) {
  const fromPhotos = (p.photos ?? []).flatMap((photo) => {
    const sizes = [photo.original_size, ...(photo.alt_sizes ?? [])].filter(
      (s): s is z.infer<typeof size> => Boolean(s && MEDIA.test(s.url)),
    );
    const file = sizes[0];
    // About 500 px for the proposal, else the file itself.
    const light =
      sizes.find((s) => (s.width ?? 0) <= 640 && (s.width ?? 0) >= 250) ?? file;
    return file ? [{ file: file.url, light: light.url }] : [];
  });
  const fromBody = [...(p.body ?? "").matchAll(IMG_SRC)].map((m) => ({
    file: m[1],
    light: m[1],
  }));
  return [...fromPhotos, ...fromBody].slice(0, IMAGES_PER_POST);
}

function toImages(raw: unknown): ExternalImage[] {
  const parsed = post.safeParse(raw);
  if (!parsed.success) return [];
  const p = parsed.data;
  const title = p.summary?.replace(/\s+/g, " ").trim() || null;
  return imagesOf(p).flatMap(({ file, light }, index) =>
    httpsUrl(file) && httpsUrl(light)
      ? [
          {
            id: `${p.blog_name}:${p.id_string}:${index}`,
            title: title ? title.slice(0, 200) : null,
            thumbnail: light,
            fileUrl: file,
            fallbackUrl: light === file ? null : light,
            fileName: null,
            // A stable address of the post; the image's rank after « # ».
            pageUrl: `https://www.tumblr.com/${p.blog_name}/${p.id_string}${index ? `#${index}` : ""}`,
            author: p.blog_name,
            license: null,
          },
        ]
      : [],
  );
}

/** The images of the latest posts carrying this tag. */
export async function searchTumblrImages(
  tag: string,
  per: number,
): Promise<ExternalImage[]> {
  const body = await call(
    "/tagged",
    new URLSearchParams({ tag, limit: String(Math.min(per, 20)) }),
  );
  return (Array.isArray(body) ? body : []).flatMap(toImages);
}

/** One image read again by « <blog>:<post id>:<index> ». */
export async function getTumblrImage(
  id: string,
): Promise<ExternalImage | null> {
  const [blog, postId, index] = id.split(":");
  if (
    !BLOG.test(blog ?? "") ||
    !POST.test(postId ?? "") ||
    !/^\d$/.test(index ?? "")
  )
    return null;
  const body = (await call(
    `/blog/${blog}.tumblr.com/posts`,
    new URLSearchParams({ id: postId }),
  )) as { posts?: unknown } | null;
  const posts = Array.isArray(body?.posts) ? body.posts : [];
  return toImages(posts[0]).find((image) => image.id === id) ?? null;
}

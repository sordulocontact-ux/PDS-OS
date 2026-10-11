import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { unstable_cache } from "next/cache";

/**
 * The picture a web page announces for itself (Open Graph, Twitter card),
 * shown as the thumbnail of a link reference. The address is typed by a
 * user: only public hosts are fetched (never the local network), redirects
 * are checked hop by hop, and at most the head of the page is read.
 * The picture is loaded by the viewer's browser, never by the server.
 */

const USER_AGENT = "Mozilla/5.0 (compatible; PDS-OS link preview)";
const TIMEOUT_MS = 5000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
// A page's picture rarely changes: one day of cache.
const REVALIDATE_SECONDS = 24 * 3600;

const IMAGE_PATH = /\.(jpe?g|png|webp|gif|avif)$/i;
const YOUTUBE_ID = /^[\w-]{11}$/;
// Most specific first.
const IMAGE_KEYS = [
  "og:image:secure_url",
  "og:image:url",
  "og:image",
  "twitter:image",
  "twitter:image:src",
];
// A whole tag announcing a picture.
const IMAGE_TAG = /<meta\s[^>]*(og:image|twitter:image)[^>]*>/i;

class TransientError extends Error {}

function httpUrl(value: string, base?: URL): URL | null {
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

// YouTube serves a still for every video at a known address.
function youtubeThumbnail(url: URL): string | null {
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com")
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : (/^\/(shorts|embed|live)\/([^/]+)/.exec(url.pathname)?.[2] ?? null);
  return id && YOUTUBE_ID.test(id)
    ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    : null;
}

function isPublicIPv4(address: string): boolean {
  const [a, b] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) return isPublicIPv4(address);
  const v6 = address.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  if (mapped) return isPublicIPv4(mapped[1]);
  return !(
    v6 === "::" ||
    v6 === "::1" ||
    /^f[cd]/.test(v6) ||
    /^fe[89ab]/.test(v6) ||
    v6.startsWith("ff")
  );
}

async function isPublicHost(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPublicAddress(host);
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new TransientError("dns");
  }
  return (
    addresses.length > 0 && addresses.every((a) => isPublicAddress(a.address))
  );
}

// Fetches a public page, following redirects only to public hosts.
async function fetchPublic(start: URL): Promise<Response | null> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isPublicHost(url.hostname))) return null;
    let response: Response;
    try {
      response = await fetch(url, {
        cache: "no-store",
        redirect: "manual",
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,image/*;q=0.8",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new TransientError("unreachable");
    }
    if (response.status < 300 || response.status >= 400) return response;
    const next = httpUrl(response.headers.get("location") ?? "", url);
    await response.body?.cancel();
    if (!next) return null;
    url = next;
  }
  return null;
}

// Read until the picture's tag shows up: usually in the head, but some
// sites (Pinterest) write it far down the page.
async function readUntilImage(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let html = "";
  let bytes = 0;
  while (bytes < MAX_BYTES && !IMAGE_TAG.test(html)) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      // Cut short (timeout): try again next time rather than cache nothing.
      throw new TransientError("interrupted");
    }
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    html += decoder.decode(chunk.value, { stream: true });
  }
  await reader.cancel().catch(() => undefined);
  return html;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    const c = String(code).toLowerCase();
    if (c.startsWith("#x"))
      return String.fromCodePoint(parseInt(c.slice(2), 16));
    if (c.startsWith("#")) return String.fromCodePoint(Number(c.slice(1)));
    return ENTITIES[c] ?? match;
  });
}

function attributesOf(tag: string): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const m of tag.matchAll(
    /([a-z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
  ))
    attrs.set(m[1].toLowerCase(), decodeEntities(m[2] ?? m[3] ?? m[4] ?? ""));
  return attrs;
}

function imageInHtml(html: string, base: URL): string | null {
  const found = new Map<string, string>();
  for (const tag of html.match(/<meta\s[^>]*>/gi) ?? []) {
    const attrs = attributesOf(tag);
    const key = (attrs.get("property") ?? attrs.get("name"))?.toLowerCase();
    const content = attrs.get("content")?.trim();
    if (key && content && !found.has(key)) found.set(key, content);
  }
  for (const tag of html.match(/<link\s[^>]*>/gi) ?? []) {
    const attrs = attributesOf(tag);
    const href = attrs.get("href")?.trim();
    if (attrs.get("rel")?.toLowerCase() === "image_src" && href)
      found.set("image_src", href);
  }
  for (const key of [...IMAGE_KEYS, "image_src"]) {
    const value = found.get(key);
    const url = value ? httpUrl(value, base) : null;
    if (url) return url.href;
  }
  return null;
}

async function previewOf(address: string): Promise<string | null> {
  const url = httpUrl(address);
  if (!url) return null;
  const youtube = youtubeThumbnail(url);
  if (youtube) return youtube;
  if (IMAGE_PATH.test(url.pathname)) return url.href;

  const response = await fetchPublic(url);
  if (!response) return null;
  if (response.status === 429 || response.status >= 500) {
    await response.body?.cancel();
    throw new TransientError(`http_${response.status}`);
  }
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.includes("html")) {
    await response.body?.cancel();
    return response.ok && type.startsWith("image/") ? url.href : null;
  }
  return imageInHtml(
    await readUntilImage(response),
    new URL(response.url || url),
  );
}

// A transient failure is thrown, hence never cached: tried again next time.
const cachedPreview = unstable_cache(previewOf, ["link-preview"], {
  revalidate: REVALIDATE_SECONDS,
});

/** The address of the page's picture; null when it has none or is unreachable. */
export async function linkPreviewImage(
  address: string,
): Promise<string | null> {
  try {
    return await cachedPreview(address);
  } catch (error) {
    if (!(error instanceof TransientError))
      console.error("linkPreviewImage:", (error as Error).message);
    return null;
  }
}

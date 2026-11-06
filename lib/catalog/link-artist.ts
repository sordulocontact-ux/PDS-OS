import "server-only";

import { z } from "zod";

import { LINK_NAMES_INSTRUCTIONS } from "@/lib/ai/instructions/link-names";
import { extract } from "@/lib/ai/llm";
import { linkNamesSchema } from "@/lib/ai/schemas/link-names";
import type {
  CaptureArtistsError,
  CaptureArtistsResult,
} from "@/lib/catalog/capture-artist-types";
import { confirmAccounts, matchPeople } from "@/lib/catalog/capture-artists";
import type { Person } from "@/lib/catalog/capture-person";
import { piecesOf } from "@/lib/catalog/capture-text";
import { fetchJson } from "@/lib/integrations/http";
import { asHandle } from "@/lib/network/socials";

/**
 * A TikTok or Instagram link shared to the Repérage (a phone's share sheet,
 * the Raccourci, a pasted link) → the account behind it, then the same
 * search as a screenshot. The handle is in the link, or TikTok's public
 * oEmbed gives it; TikTok and Instagram give the names shown and the
 * picture; PO then proposes the artist name hidden in those names
 * (« theodorabosslady » → « Theodora »), kept by the code only if it is a
 * piece of one (docs/ARCHITECTURE.md § 10 bis).
 */

// A person has a handful of artist names.
const MAX_SEARCH_NAMES = 3;
const REASONING_MAX = 500;

type Target = { network: "tiktok" | "instagram"; handle: string };
type LinkError = Extract<
  CaptureArtistsError,
  "invalid_link" | "instagram_post" | "link_unreadable"
>;

const TIKTOK = new Set([
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
]);
const SHORT_TIKTOK = new Set(["vm.tiktok.com", "vt.tiktok.com"]);
const INSTAGRAM = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com",
]);
// Instagram paths that name a post, not its author.
const INSTAGRAM_POSTS = new Set(["p", "reel", "reels", "tv"]);
const INSTAGRAM_PAGES = new Set([
  "explore",
  "accounts",
  "direct",
  "about",
  "legal",
  "developer",
]);
// A short link redirects once or twice; never more.
const MAX_HOPS = 3;

const oembedSchema = z.object({ author_url: z.string().url().optional() });

/** The first web address in a text (a share often adds words around it). */
export function linkIn(text: string): URL | null {
  const raw = /https?:\/\/[^\s<>"']+/i.exec(text)?.[0];
  if (!raw) return null;
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export async function readLinkArtist(
  text: string,
): Promise<CaptureArtistsResult | LinkError> {
  const startedAt = performance.now();
  const url = linkIn(text);
  if (!url) return "invalid_link";

  let target: Target | LinkError;
  if (TIKTOK.has(url.hostname)) {
    const handle = await tiktokHandleOf(url);
    target = handle ? { network: "tiktok", handle } : "link_unreadable";
  } else if (INSTAGRAM.has(url.hostname)) {
    target = instagramTarget(url);
  } else {
    target = "invalid_link";
  }
  if (typeof target === "string") return target;

  const confirmed = await confirmAccounts(personOf(target));
  const named = await withArtistNames(confirmed);
  const [artist] = await matchPeople([named]);
  return {
    isTikTok: true,
    analysis: "",
    artists: [artist],
    model: "",
    durationMs: Math.round(performance.now() - startedAt),
  };
}

/**
 * PO's artist names for the account, searched on Deezer; the person is
 * shown under the first one, else under the name a platform shows, else
 * the handle. Without PO (quota, provider down) the search still runs on
 * the names read.
 */
async function withArtistNames(person: Person): Promise<Person> {
  const [handle, ...shown] = person.names;
  const reading = await extract(
    linkNamesSchema,
    JSON.stringify({ pseudo: handle, nomsAffiches: shown }),
    LINK_NAMES_INSTRUCTIONS,
  ).catch((error: unknown) => {
    console.error("link-artist:", error);
    return null;
  });
  const searchNames = piecesOf(
    reading?.output.searchNames ?? [],
    person.names,
  ).slice(0, MAX_SEARCH_NAMES);
  return {
    ...person,
    searchNames,
    artistName: searchNames[0] ?? shown[0] ?? handle,
    reasoning: reading?.output.reasoning.trim().slice(0, REASONING_MAX) ?? "",
  };
}

function personOf({ network, handle }: Target): Person {
  return {
    names: [handle],
    artistName: handle,
    role: "account",
    reasoning: "",
    tiktok: null,
    profile: null,
    picture: null,
    searchNames: [],
    clues: [],
    links: [],
    read: {
      tiktok: network === "tiktok" ? handle : null,
      instagram: network === "instagram" ? handle : null,
    },
    readFrom: "link",
    bioInstagram: null,
    email: null,
    writtenText: "",
    activity: "unknown",
  };
}

// tiktok.com/@x, tiktok.com/@x/video/…, a short link (vm.tiktok.com/…,
// tiktok.com/t/…) followed to its page, or a video without its author
// (tiktok.com/@/video/…) asked to TikTok's oEmbed.
async function tiktokHandleOf(start: URL): Promise<string | null> {
  let url = start;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const handle = asHandle(/^\/@([^/]+)/.exec(url.pathname)?.[1]);
    if (handle) return handle;
    const video = /\/video\/(\d+)/.exec(url.pathname)?.[1];
    if (video) return authorOfVideo(video);
    const short =
      SHORT_TIKTOK.has(url.hostname) || url.pathname.startsWith("/t/");
    if (!short || hop === MAX_HOPS) return null;
    const next = await redirectOf(url);
    if (!next || !TIKTOK.has(next.hostname)) return null;
    url = next;
  }
  return null;
}

async function redirectOf(url: URL): Promise<URL | null> {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const location = response.headers.get("location");
    return location ? new URL(location, url) : null;
  } catch {
    return null;
  }
}

async function authorOfVideo(id: string): Promise<string | null> {
  const oembed = new URL("https://www.tiktok.com/oembed");
  oembed.searchParams.set("url", `https://www.tiktok.com/@/video/${id}`);
  try {
    const parsed = oembedSchema.safeParse(await fetchJson("tiktok", oembed));
    const author = parsed.success ? parsed.data.author_url : undefined;
    return author
      ? asHandle(new URL(author).pathname.replace(/^\/@?/, ""))
      : null;
  } catch {
    return null;
  }
}

// instagram.com/<handle>, …/stories/<handle>/…; a post or a reel does not
// say who published it (Instagram's oEmbed needs a Meta app and a token).
function instagramTarget(url: URL): Target | LinkError {
  const [first, second] = url.pathname.split("/").filter(Boolean);
  if (!first) return "invalid_link";
  if (INSTAGRAM_POSTS.has(first)) return "instagram_post";
  if (INSTAGRAM_PAGES.has(first)) return "invalid_link";
  const handle = asHandle(first === "stories" ? second : first);
  return handle ? { network: "instagram", handle } : "invalid_link";
}

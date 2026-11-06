/**
 * What a public TikTok or Instagram profile page says about its owner, read
 * by the code in the HTML any visitor gets: TikTok writes the avatar in the
 * page's data, Instagram announces the name and the picture as the page's
 * Open Graph tags. Pure: the pages are fetched by their callers
 * (tiktok-profile.ts, instagram-profile.ts, social-picture.ts).
 */

// Only the platforms' own image hosts are shown or downloaded from.
const IMAGE_HOSTS = [
  /\.tiktokcdn(-[a-z]+)?\.com$/,
  /\.cdninstagram\.com$/,
  /\.fbcdn\.net$/,
];

/** A picture address, kept only on a platform's image host, over https. */
export function socialImageUrl(value: string | null | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      IMAGE_HOSTS.some((host) => host.test(url.hostname))
      ? url
      : null;
  } catch {
    return null;
  }
}

// "https://…" as written in TikTok's page data.
function unescapeJson(value: string): string {
  return value.replace(/\\u([0-9a-f]{4})/gi, (_, code: string) =>
    String.fromCharCode(parseInt(code, 16)),
  );
}

/** The avatar written in a TikTok profile page, or null. */
export function tiktokAvatar(html: string): string | null {
  // 720 px is plenty for an avatar; the 1080 px one as a fallback.
  for (const key of ["avatarMedium", "avatarLarger", "avatarThumb"]) {
    const match = new RegExp(`"${key}":"([^"]+)"`).exec(html);
    if (match) return unescapeJson(match[1]);
  }
  return null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function metaContent(html: string, property: string): string | null {
  const tag = new RegExp(`<meta[^>]+property="${property}"[^>]*>`, "i").exec(
    html,
  )?.[0];
  const content = tag && /content="([^"]*)"/i.exec(tag)?.[1];
  return content ? decodeEntities(content) : null;
}

/** The picture an Instagram profile page announces (Open Graph), or null. */
export function instagramPicture(html: string): string | null {
  return metaContent(html, "og:image");
}

/**
 * The name and picture an Instagram profile page announces:
 * « Theodora Miss KITOKO (@theodorabosslady) • Instagram photos and videos ».
 * Null when the page is not that account's (a login wall says
 * « Instagram »); the name is empty when the account shows none.
 */
export function instagramMeta(
  html: string,
  handle: string,
): { displayName: string; pictureUrl: string | null } | null {
  const title = metaContent(html, "og:title");
  const match = title && /^(.*?)\s*\(@([A-Za-z0-9._]+)\)/.exec(title);
  if (!match || match[2].toLowerCase() !== handle.toLowerCase()) return null;
  return {
    displayName: match[1].trim(),
    pictureUrl: instagramPicture(html),
  };
}

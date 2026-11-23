import "server-only";

import { isIconDomain } from "@/lib/mailbox/sender-domain";

/**
 * The single entry point of the senders' icons (page « Mails », Sacha
 * 23/11/2026: « j'ai besoin des icônes des mails »): a brand's icon from
 * DuckDuckGo's icon service, asked by the server only (the reader's browser
 * never calls it), always the same host: the domain read in a mail is a
 * name in the path, never an address the server opens (no SSRF). Only the
 * domain is sent, never an address or a mail.
 */

/** The icon of a domain, null when it has none (the initials stay). */
export async function fetchFavicon(
  domain: string,
): Promise<{ type: string; content: Uint8Array } | null> {
  if (!isIconDomain(domain)) return null;
  try {
    const response = await fetch(
      `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 604_800 } },
    );
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.startsWith("image/")) return null;
    const content = new Uint8Array(await response.arrayBuffer());
    // An icon is small: anything larger is not one.
    return content.byteLength > 0 && content.byteLength <= 200_000
      ? { type, content }
      : null;
  } catch {
    return null;
  }
}

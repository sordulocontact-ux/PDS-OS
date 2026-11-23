import { getAccess } from "@/lib/auth/dal";
import { fetchFavicon } from "@/lib/integrations/favicon";
import { isIconDomain } from "@/lib/mailbox/sender-domain";

/**
 * A sender's icon for the page « Mails » (?domain=vercel.com), for a
 * signed-in member only; 404 when the brand has none (the avatar then shows
 * the initials). Kept a week by the browser.
 */
export async function GET(request: Request) {
  const access = await getAccess();
  if (access.state !== "approved") return new Response(null, { status: 401 });
  const domain = new URL(request.url).searchParams.get("domain") ?? "";
  const icon = isIconDomain(domain) ? await fetchFavicon(domain) : null;
  if (!icon) return new Response(null, { status: 404 });
  return new Response(new Blob([icon.content as BlobPart]), {
    headers: {
      "Content-Type": icon.type,
      "Cache-Control": "private, max-age=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

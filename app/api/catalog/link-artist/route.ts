import { isAiQuotaExceeded } from "@/lib/ai/quota";
import { getAccess } from "@/lib/auth/dal";
import type { CaptureArtistsError } from "@/lib/catalog/capture-artist-types";
import { readLinkArtist } from "@/lib/catalog/link-artist";
import { IntegrationError } from "@/lib/integrations/http";

// A link and a few words around it (a share sheet's text), never more.
const MAX_LENGTH = 2000;

const fail = (error: CaptureArtistsError, status: number) =>
  Response.json({ error }, { status });

/**
 * Repérage: one TikTok or Instagram link → the account behind it, its
 * Deezer account and its networks. Any approved member; writes nothing.
 */
export async function POST(request: Request) {
  const access = await getAccess();
  if (access.state !== "approved") return fail("unauthorized", 401);

  const body: unknown = await request.json().catch(() => null);
  const text =
    body && typeof body === "object" && "url" in body ? body.url : null;
  if (typeof text !== "string" || !text.trim() || text.length > MAX_LENGTH)
    return fail("invalid_link", 400);

  try {
    const result = await readLinkArtist(text);
    if (typeof result === "string") return fail(result, 422);
    return Response.json(result);
  } catch (error) {
    if (error instanceof IntegrationError)
      return fail("deezer_unavailable", 502);
    console.error("link-artist:", error);
    if (isAiQuotaExceeded(error)) return fail("ai_quota", 429);
    return fail("provider_error", 502);
  }
}

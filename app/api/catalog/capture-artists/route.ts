import { isAiQuotaExceeded } from "@/lib/ai/quota";
import { getAccess } from "@/lib/auth/dal";
import type { CaptureArtistsError } from "@/lib/catalog/capture-artist-types";
import { readCaptureArtists } from "@/lib/catalog/capture-artists";
import { IntegrationError } from "@/lib/integrations/http";

// The browser shrinks each screenshot first (lib/images/shrink-image.ts):
// a few hundred kilobytes. Vercel refuses a body over 4.5 MB anyway.
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

const fail = (error: CaptureArtistsError, status: number) =>
  Response.json({ error }, { status });

/**
 * Labo: one TikTok screenshot → the artists named on it and their Deezer
 * account. Any approved member; writes nothing, the image is not kept.
 */
export async function POST(request: Request) {
  const access = await getAccess();
  if (access.state !== "approved") return fail("unauthorized", 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("no_file", 400);
  if (file.size > MAX_BYTES) return fail("file_too_large", 413);
  if (!TYPES.includes(file.type)) return fail("unsupported_type", 415);

  try {
    const result = await readCaptureArtists({
      data: new Uint8Array(await file.arrayBuffer()),
      mediaType: file.type,
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof IntegrationError)
      return fail("deezer_unavailable", 502);
    console.error("capture-artists:", error);
    if (isAiQuotaExceeded(error)) return fail("ai_quota", 429);
    return fail("provider_error", 502);
  }
}

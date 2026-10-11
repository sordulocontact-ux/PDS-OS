import "server-only";

import { IntegrationError } from "@/lib/integrations/http";

// What the image sources (Are.na, Openverse) share: one image as the app
// proposes it, and the download of its file.

export const IMAGE_USER_AGENT = "PDS-OS/0.1 (internal release tracker)";
// The largest file kept as a reference, far below the bucket's 50 MB.
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** One image found by a source. */
export type ExternalImage = {
  // The source's own id: a block number (Are.na), a uuid (Openverse).
  id: string;
  title: string | null;
  // Shown while choosing, never stored.
  thumbnail: string;
  // The file kept when the image becomes a reference; `fallbackUrl` when
  // that one is too heavy.
  fileUrl: string;
  fallbackUrl: string | null;
  fileName: string | null;
  // Its page at the source, written in the reference's note.
  pageUrl: string;
  author: string | null;
  // Openverse only: « CC BY-SA 2.0 », « CC0 ».
  license: string | null;
};

export const httpsUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https:\/\/\S+$/.test(value);

/** The image file itself, its type as the host serves it. */
export async function downloadImage(
  service: string,
  url: string,
): Promise<{ data: Uint8Array; mime: string }> {
  if (!httpsUrl(url)) throw new IntegrationError(service, "not_https");
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": IMAGE_USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new IntegrationError(service, "unreachable");
  }
  if (!response.ok)
    throw new IntegrationError(service, `http_${response.status}`);
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES)
    throw new IntegrationError(service, "too_large");
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.byteLength === 0 || data.byteLength > MAX_IMAGE_BYTES)
    throw new IntegrationError(service, "too_large");
  const mime = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  return { data, mime };
}

/** The file, or its lighter version when the original is too heavy. */
export async function downloadImageOf(
  service: string,
  image: ExternalImage,
): Promise<{ data: Uint8Array; mime: string }> {
  try {
    return await downloadImage(service, image.fileUrl);
  } catch (error) {
    const tooLarge =
      error instanceof IntegrationError && error.reason === "too_large";
    if (!tooLarge || !image.fallbackUrl) throw error;
    return downloadImage(service, image.fallbackUrl);
  }
}

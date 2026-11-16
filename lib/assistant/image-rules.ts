// Images joined to a question to PO (docs/ASSISTANT.md § 2 quinquies): bucket,
// accepted files and the address a message keeps. Client-safe: the browser
// checks before uploading, the route and the bucket check the same.

export const ASSISTANT_IMAGE_BUCKET = "assistant-images";
export const MAX_ASSISTANT_IMAGE_BYTES = 5 * 1024 * 1024;
/** Joined to one question. */
export const MAX_IMAGES_PER_MESSAGE = 4;
/** Read by PO in one conversation: every question resends the earlier ones. */
export const MAX_IMAGES_PER_CONVERSATION = 12;

/** What the models read (Claude, Ministral): PNG, JPEG, WebP, GIF. */
export const ASSISTANT_IMAGE_EXTENSIONS: Record<
  string,
  "jpg" | "png" | "webp" | "gif"
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
export const ASSISTANT_IMAGE_ACCEPT = Object.keys(
  ASSISTANT_IMAGE_EXTENSIONS,
).join(",");

/** A message keeps the image's address in the app, never its bytes: the
 * history stays light, and the image is read with the viewer's session. */
export const ASSISTANT_IMAGE_ROUTE = "/api/assistant/images";

const PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

/** "<person_id>/<uuid>.<ext>", as the bucket's policies read it. */
export function isAssistantImagePath(path: string): boolean {
  return PATH.test(path);
}

export function assistantImageUrl(path: string): string {
  return `${ASSISTANT_IMAGE_ROUTE}/${path}`;
}

/** The stored path behind an image's address; null for any other address. */
export function assistantImagePathOf(url: string): string | null {
  const prefix = `${ASSISTANT_IMAGE_ROUTE}/`;
  if (!url.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  return isAssistantImagePath(path) ? path : null;
}

/** Why a file is refused, before any upload; null when it fits. */
export function assistantImageProblem(file: File): "type" | "size" | null {
  if (!ASSISTANT_IMAGE_EXTENSIONS[file.type]) return "type";
  if (file.size > MAX_ASSISTANT_IMAGE_BYTES) return "size";
  return null;
}

import type { FileUIPart } from "ai";

/** A question to PO as the AI SDK sends it: its text, its images (an image
 * alone is a question too, docs/ASSISTANT.md § 2 quinquies). */
export function questionOf(text: string, images: FileUIPart[]) {
  if (images.length === 0) return { text };
  return text ? { text, files: images } : { files: images };
}

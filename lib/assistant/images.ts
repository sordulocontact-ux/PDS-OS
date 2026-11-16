import "server-only";

import type { FileUIPart, UIMessage } from "ai";

import {
  ASSISTANT_IMAGE_BUCKET,
  ASSISTANT_IMAGE_EXTENSIONS,
  assistantImagePathOf,
  MAX_IMAGES_PER_CONVERSATION,
  MAX_IMAGES_PER_MESSAGE,
} from "@/lib/assistant/image-rules";
import type { createClient } from "@/lib/supabase/server";

/**
 * Images joined to a question to PO (docs/ASSISTANT.md § 2 quinquies). A
 * message keeps the image's address in the app (/api/assistant/images/…);
 * the route reads the bytes with the member's session (RLS: their own only)
 * just before asking the model, which never fetches an address itself.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Part = UIMessage["parts"][number];

export type ImageCheck =
  | { ok: true; messages: UIMessage[] }
  | { ok: false; error: "invalid_image" | "too_many_images" };

const isFile = (part: Part): part is FileUIPart => part.type === "file";

/**
 * The turns as the client sent them, with every file part checked: in a
 * question, only the sender's own images (address, type), rebuilt from
 * those two facts alone (no provider reference, no other field); none in an
 * answer. Bounded per question and per conversation.
 */
export function checkImages(
  messages: UIMessage[],
  personId: string,
): ImageCheck {
  let total = 0;
  const checked: UIMessage[] = [];
  for (const message of messages) {
    const files = message.parts.filter(isFile);
    if (files.length === 0) {
      checked.push(message);
      continue;
    }
    if (message.role !== "user") return { ok: false, error: "invalid_image" };
    if (files.length > MAX_IMAGES_PER_MESSAGE)
      return { ok: false, error: "too_many_images" };
    total += files.length;
    if (total > MAX_IMAGES_PER_CONVERSATION)
      return { ok: false, error: "too_many_images" };

    const parts: Part[] = [];
    for (const part of message.parts) {
      if (!isFile(part)) {
        parts.push(part);
        continue;
      }
      const path = assistantImagePathOf(part.url);
      if (
        !path ||
        !path.startsWith(`${personId}/`) ||
        !ASSISTANT_IMAGE_EXTENSIONS[part.mediaType]
      )
        return { ok: false, error: "invalid_image" };
      parts.push({ type: "file", mediaType: part.mediaType, url: part.url });
    }
    checked.push({ ...message, parts });
  }
  return { ok: true, messages: checked };
}

/**
 * The same turns for the model: each image's bytes, read from the bucket
 * with the member's session, as a data URL. An image gone since (its
 * conversation is the only thing that removes it) is said to be missing.
 */
export async function withImageData(
  supabase: Supabase,
  messages: UIMessage[],
): Promise<UIMessage[]> {
  const bucket = supabase.storage.from(ASSISTANT_IMAGE_BUCKET);
  const read = async (part: FileUIPart): Promise<Part> => {
    const path = assistantImagePathOf(part.url);
    const { data, error } = path
      ? await bucket.download(path)
      : { data: null, error: true };
    if (error || !data) return { type: "text", text: "[image unavailable]" };
    const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
    return { ...part, url: `data:${part.mediaType};base64,${base64}` };
  };
  return Promise.all(
    messages.map(async (message) =>
      message.parts.some(isFile)
        ? {
            ...message,
            parts: await Promise.all(
              message.parts.map((part) => (isFile(part) ? read(part) : part)),
            ),
          }
        : message,
    ),
  );
}

/** The stored paths of the images a conversation holds. */
export function imagePathsOf(messages: unknown): string[] {
  if (!Array.isArray(messages)) return [];
  return messages.flatMap((message: unknown) => {
    const parts =
      message && typeof message === "object" && "parts" in message
        ? message.parts
        : [];
    if (!Array.isArray(parts)) return [];
    return parts.flatMap((part: unknown) =>
      part &&
      typeof part === "object" &&
      "type" in part &&
      part.type === "file" &&
      "url" in part &&
      typeof part.url === "string"
        ? (assistantImagePathOf(part.url) ?? [])
        : [],
    );
  });
}

/** Removes images from the bucket (RLS: one's own). Never throws: a file
 * left behind must not undo what was asked. */
export async function removeAssistantImages(
  supabase: Supabase,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage
    .from(ASSISTANT_IMAGE_BUCKET)
    .remove(paths);
  if (error) console.error("[assistant] images not removed:", error.message);
}

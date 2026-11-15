"use client";

import type { FileUIPart } from "ai";
import { useEffect, useRef, useState } from "react";

import {
  ASSISTANT_IMAGE_ROUTE,
  assistantImageProblem,
  MAX_IMAGES_PER_MESSAGE,
} from "@/lib/assistant/image-rules";
import { assistant } from "@/lib/i18n/fr/assistant";
import { shrinkImage } from "@/lib/images/shrink-image";

const fr = { assistant };

export type AttachedImage = {
  id: string;
  // Shown at once, from the file itself, while it is sent.
  preview: string;
  status: "uploading" | "ready" | "failed";
  part?: FileUIPart;
};

async function upload(file: File): Promise<FileUIPart | null> {
  const body = new FormData();
  body.set("file", await shrinkImage(file));
  const response = await fetch(ASSISTANT_IMAGE_ROUTE, {
    method: "POST",
    body,
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json()) as { url: string; mediaType: string };
  return { type: "file", url: data.url, mediaType: data.mediaType };
}

/**
 * The images joined to the question being written (docs/ASSISTANT.md
 * § 2 quinquies): each one is shrunk and sent as soon as it is added, so
 * the question leaves without waiting. `error` says why one was refused,
 * until the next gesture.
 */
export function useImageAttachments() {
  const t = fr.assistant.images;
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Read when the composer goes away: previews still shown are released.
  const shown = useRef<AttachedImage[]>([]);
  useEffect(() => {
    shown.current = images;
  });
  useEffect(
    () => () => shown.current.forEach((i) => URL.revokeObjectURL(i.preview)),
    [],
  );

  const update = (id: string, change: Partial<AttachedImage>) =>
    setImages((list) =>
      list.map((i) => (i.id === id ? { ...i, ...change } : i)),
    );

  function add(files: File[]) {
    setError(null);
    const room = MAX_IMAGES_PER_MESSAGE - shown.current.length;
    const problems = files.map(assistantImageProblem);
    const accepted = files.filter((_, i) => problems[i] === null);
    if (problems.includes("type")) setError(t.problem.type);
    else if (problems.includes("size")) setError(t.problem.size);
    if (accepted.length > room)
      setError(t.problem.count(MAX_IMAGES_PER_MESSAGE));

    for (const file of accepted.slice(0, Math.max(room, 0))) {
      const image: AttachedImage = {
        id: crypto.randomUUID(),
        preview: URL.createObjectURL(file),
        status: "uploading",
      };
      setImages((list) => [...list, image]);
      void upload(file).then((part) => {
        update(
          image.id,
          part ? { status: "ready", part } : { status: "failed" },
        );
        if (!part) setError(t.problem.failed);
      });
    }
  }

  function remove(id: string) {
    setError(null);
    const image = shown.current.find((i) => i.id === id);
    if (!image) return;
    URL.revokeObjectURL(image.preview);
    setImages((list) => list.filter((i) => i.id !== id));
    // Taken back before sending: nothing keeps it.
    if (image.part)
      void fetch(
        `${ASSISTANT_IMAGE_ROUTE}?url=${encodeURIComponent(image.part.url)}`,
        { method: "DELETE" },
      ).catch(() => undefined);
  }

  /** Sent with the question: the bubble shows them from their address now. */
  function clear() {
    shown.current.forEach((i) => URL.revokeObjectURL(i.preview));
    setImages([]);
    setError(null);
  }

  return {
    images,
    error,
    setError,
    add,
    remove,
    clear,
    uploading: images.some((i) => i.status === "uploading"),
    failed: images.some((i) => i.status === "failed"),
    parts: images.flatMap((i) => (i.part ? [i.part] : [])),
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CaptureArtistsError,
  CaptureArtistsResult,
} from "@/lib/catalog/capture-artist-types";
import { shrinkImage } from "@/lib/images/shrink-image";

/** A screenshot (`file`) or a shared TikTok / Instagram link (`link`). */
export type CaptureItem = {
  id: string;
  file: File | null;
  link: string | null;
  status: "queued" | "reading" | "done" | "failed";
  result?: CaptureArtistsResult;
  error?: CaptureArtistsError | "network" | "timeout";
};

export const CAPTURE_TYPES = ["image/png", "image/jpeg", "image/webp"];
// Two at a time: Mistral's free tier and Deezer (50 requests / 5 s) both
// refuse a burst.
const PARALLEL = 2;
// Vercel refuses a body over 4.5 MB before the route runs (no JSON, no log):
// past this, even once shrunk, the image is not sent.
const SEND_LIMIT = 4 * 1024 * 1024;

// A link and the few words a share sheet adds around it.
const MAX_LINK_LENGTH = 2000;

// A refusal that did not come from the route (no JSON body), by its status.
function errorOf(status: number): CaptureItem["error"] {
  if (status === 413) return "file_too_large";
  if (status === 408 || status === 504) return "timeout";
  return "provider_error";
}

let seq = 0;

// The screenshot, shrunk by the browser first (shrinkImage); null when it is
// still too heavy to be sent. The original stays for the thumbnail.
async function sendFile(original: File): Promise<Response | null> {
  const file = await shrinkImage(original);
  if (file.size > SEND_LIMIT) return null;
  const body = new FormData();
  body.set("file", file);
  return fetch("/api/catalog/capture-artists", { method: "POST", body });
}

/** Screenshots and links read one by one by the server, two at a time, in
 * order. */
export function useCaptureQueue() {
  const [items, setItems] = useState<CaptureItem[]>([]);
  const running = useRef(new Set<string>());

  const update = useCallback(
    (id: string, patch: Partial<CaptureItem>) =>
      setItems((all) => all.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    [],
  );

  const read = useCallback(
    async (item: CaptureItem) => {
      running.current.add(item.id);
      update(item.id, { status: "reading", error: undefined });
      try {
        const response = item.file
          ? await sendFile(item.file)
          : await fetch("/api/catalog/link-artist", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ url: item.link }),
            });
        if (!response) {
          update(item.id, { status: "failed", error: "file_too_large" });
          return;
        }
        const json: unknown = await response.json().catch(() => null);
        if (response.ok)
          update(item.id, {
            status: "done",
            result: json as CaptureArtistsResult,
          });
        else
          update(item.id, {
            status: "failed",
            error:
              (json as { error?: CaptureArtistsError } | null)?.error ??
              errorOf(response.status),
          });
      } catch {
        update(item.id, { status: "failed", error: "network" });
      } finally {
        running.current.delete(item.id);
      }
    },
    [update],
  );

  // Starts the next queued screenshots whenever a slot frees up.
  useEffect(() => {
    const free = PARALLEL - running.current.size;
    items
      .filter((i) => i.status === "queued" && !running.current.has(i.id))
      .slice(0, Math.max(free, 0))
      .forEach((i) => void read(i));
  }, [items, read]);

  const add = useCallback((files: File[]) => {
    const images = files.filter((f) => CAPTURE_TYPES.includes(f.type));
    setItems((all) => [
      ...all,
      ...images.map((file) => ({
        id: `capture-${++seq}`,
        file,
        link: null,
        status: "queued" as const,
      })),
    ]);
    return files.length - images.length;
  }, []);

  // A link already in the queue is not read twice (a share sent again).
  const addLink = useCallback((text: string) => {
    const link = text.trim().slice(0, MAX_LINK_LENGTH);
    if (!link) return;
    setItems((all) =>
      all.some((i) => i.link === link)
        ? all
        : [
            ...all,
            {
              id: `capture-${++seq}`,
              file: null,
              link,
              status: "queued" as const,
            },
          ],
    );
  }, []);

  const remove = useCallback(
    (id: string) => setItems((all) => all.filter((i) => i.id !== id)),
    [],
  );
  const retry = useCallback(
    (id: string) => update(id, { status: "queued", error: undefined }),
    [update],
  );

  return { items, add, addLink, remove, retry };
}

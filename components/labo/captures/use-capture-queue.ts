"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CaptureArtistsError,
  CaptureArtistsResult,
} from "@/lib/catalog/capture-artist-types";
import { shrinkImage } from "@/lib/images/shrink-image";

export type CaptureItem = {
  id: string;
  file: File;
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

// A refusal that did not come from the route (no JSON body), by its status.
function errorOf(status: number): CaptureItem["error"] {
  if (status === 413) return "file_too_large";
  if (status === 408 || status === 504) return "timeout";
  return "provider_error";
}

let seq = 0;

/** Screenshots read one by one by the server, two at a time, in order;
 * each shrunk by the browser first (shrinkImage), the original kept for
 * the thumbnail and a new reading. */
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
        const file = await shrinkImage(item.file);
        if (file.size > SEND_LIMIT) {
          update(item.id, { status: "failed", error: "file_too_large" });
          return;
        }
        const body = new FormData();
        body.set("file", file);
        const response = await fetch("/api/catalog/capture-artists", {
          method: "POST",
          body,
        });
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
        status: "queued" as const,
      })),
    ]);
    return files.length - images.length;
  }, []);

  const remove = useCallback(
    (id: string) => setItems((all) => all.filter((i) => i.id !== id)),
    [],
  );
  const retry = useCallback(
    (id: string) => update(id, { status: "queued", error: undefined }),
    [update],
  );

  return { items, add, remove, retry };
}

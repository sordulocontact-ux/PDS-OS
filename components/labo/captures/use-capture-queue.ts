"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CaptureArtistsError,
  CaptureArtistsResult,
} from "@/lib/catalog/capture-artist-types";

export type CaptureItem = {
  id: string;
  file: File;
  status: "queued" | "reading" | "done" | "failed";
  result?: CaptureArtistsResult;
  error?: CaptureArtistsError | "network";
};

export const CAPTURE_TYPES = ["image/png", "image/jpeg", "image/webp"];
// Two at a time: Mistral's free tier and Deezer (50 requests / 5 s) both
// refuse a burst.
const PARALLEL = 2;

let seq = 0;

/** Screenshots read one by one by the server, two at a time, in order. */
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
      const body = new FormData();
      body.set("file", item.file);
      try {
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
              "provider_error",
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

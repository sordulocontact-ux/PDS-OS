"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a media query matches, followed live (a window resized, a tablet
 * turned). False on the server and at hydration: a layout that differs by
 * width draws its narrow form first.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

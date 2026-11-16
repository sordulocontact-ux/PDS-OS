"use client";

import { useSyncExternalStore } from "react";

import {
  DESIGN_STYLE_COOKIE,
  DESIGN_STYLE_MAX_AGE,
  type DesignStyle,
} from "@/lib/ui/design-style";

// The style drawn on this page (lib/ui/design-style.ts), read from the mark
// on <html> the head script sets, and followed when Réglages switches it.
// The server draws the new style: whatever only exists on the client (a
// modal, a menu) is drawn after hydration, with the right one.
function read(): DesignStyle {
  return document.documentElement.dataset.style === "classic"
    ? "classic"
    : "modern";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-style"],
  });
  return () => observer.disconnect();
}

export function useDesignStyle(): DesignStyle {
  return useSyncExternalStore(subscribe, read, () => "modern");
}

/** Switches this browser to a style, at once and for the next visits. */
export function setDesignStyle(style: DesignStyle) {
  // The cookie for the next page loads (the head script reads it).
  document.cookie = `${DESIGN_STYLE_COOKIE}=${style}; path=/; max-age=${DESIGN_STYLE_MAX_AGE}; samesite=lax`;
  if (style === "classic")
    document.documentElement.setAttribute("data-style", "classic");
  else document.documentElement.removeAttribute("data-style");
}

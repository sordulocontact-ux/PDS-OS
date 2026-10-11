"use client";

import { useEffect } from "react";

// The key that starts a zone capture, as Figma's comment tool.
export const CAPTURE_KEY = "c";

// C types a letter in a field: never taken there.
const TYPES_TEXT =
  "input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox], [role=combobox]";

/**
 * C, from any page, outside a field and with no window open: starts a zone
 * capture for a feedback.
 */
export function useCaptureShortcut(enabled: boolean, onStart: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      // Autofill fires keydown events with no key.
      if (
        event.key?.toLowerCase() !== CAPTURE_KEY ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        event.defaultPrevented
      )
        return;
      if (event.target instanceof Element && event.target.closest(TYPES_TEXT))
        return;
      // Another window or panel is open: the key stays theirs.
      if (document.querySelector("[role=dialog]")) return;
      event.preventDefault();
      onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onStart]);
}

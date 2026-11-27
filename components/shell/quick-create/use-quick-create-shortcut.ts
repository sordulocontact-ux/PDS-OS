"use client";

import { useEffect } from "react";

// Keys typed in (a field, an editable zone): « N » stays theirs there.
const TAKES_TEXT =
  "input, textarea, select, [contenteditable], [role=textbox], [role=combobox]";

/**
 * « N » (« nouveau ») alone opens the « + » menu from any page (not in a
 * field, not while a window or a menu is already open). Not « C »: it starts
 * a feedback's zone capture (use-capture-shortcut.ts). One listener per
 * page: only the button on screen passes `enabled`.
 */
export function useQuickCreateShortcut(enabled: boolean, onOpen: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      const plain =
        event.key?.toLowerCase() === "n" &&
        !event.repeat &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey;
      if (!plain || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof Element && target.closest(TAKES_TEXT)) return;
      if (document.querySelector("[role=dialog], [role=menu]")) return;
      event.preventDefault();
      onOpen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onOpen]);
}

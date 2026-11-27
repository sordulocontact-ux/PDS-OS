"use client";

import { useEffect, useRef } from "react";

import { useShortcuts } from "@/components/shell/shortcuts/shortcuts-provider";
import {
  DOUBLE_PRESS_MS,
  pressMatches,
  type ShortcutAction,
} from "@/lib/shortcuts/definitions";

// A key alone types a letter in a field: never taken there.
const TYPES_TEXT =
  "input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox], [role=combobox]";
// Space also activates a button or a link.
const TAKES_SPACE = `${TYPES_TEXT}, button, a, [role=button], [role=checkbox], [role=menuitem], [role=option], [role=switch], [role=tab]`;

/**
 * Listens for one of the reader's shortcuts, from any page. With ⌘ it
 * answers everywhere; a key alone never in a field, nor while a window or
 * a menu is open (the key is theirs). A doubled key (Espace Espace) counts
 * two presses within DOUBLE_PRESS_MS, and not when the first one scrolled
 * the page (UX test of 15/11/2026, a keyboard reader paging down).
 * `capture`: answers before the bubbling listeners (Finance's ⌘K before
 * the app's); a shortcut already taken (`defaultPrevented`) is skipped.
 */
export function useKeyShortcut(
  action: ShortcutAction,
  onTrigger: () => void,
  {
    enabled = true,
    capture = false,
  }: { enabled?: boolean; capture?: boolean } = {},
) {
  const shortcut = useShortcuts().shortcuts[action];
  const trigger = useRef(onTrigger);
  useEffect(() => {
    trigger.current = onTrigger;
  });
  const { key, mod, double } = shortcut;

  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (!pressMatches(event, { key, mod, double })) {
        last = 0;
        return;
      }
      if (!mod) {
        const typed = key === " " ? TAKES_SPACE : TYPES_TEXT;
        if (event.target instanceof Element && event.target.closest(typed)) {
          last = 0;
          return;
        }
        if (document.querySelector("[role=dialog], [role=menu]")) return;
      }
      if (double && event.timeStamp - last >= DOUBLE_PRESS_MS) {
        last = event.timeStamp;
        return;
      }
      last = 0;
      event.preventDefault();
      trigger.current();
    };
    const onScroll = () => {
      last = 0;
    };
    window.addEventListener("keydown", onKey, { capture });
    if (double)
      window.addEventListener("scroll", onScroll, {
        capture: true,
        passive: true,
      });
    return () => {
      window.removeEventListener("keydown", onKey, { capture });
      if (double)
        window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [enabled, capture, key, mod, double]);
}

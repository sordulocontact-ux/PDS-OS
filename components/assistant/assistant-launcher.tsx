"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

import { useAssistant } from "@/components/assistant/assistant-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { assistant } from "@/lib/i18n/fr/assistant";

const fr = { assistant };

// The window's conversation and the AI SDK load when it opens, never with
// every page (page loads audit, 27/10/2026).
const LauncherConversation = dynamic(
  () => import("@/components/assistant/launcher-conversation"),
);

// Two presses of Space within this delay open PO.
const DOUBLE_PRESS_MS = 350;

// Space types in a field and activates a button or a link: never taken there.
const TAKES_SPACE =
  "input, textarea, select, button, a, [contenteditable], [role=button], [role=checkbox], [role=combobox], [role=menuitem], [role=option], [role=switch], [role=tab], [role=textbox]";

function spaceBelongsTo(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TAKES_SPACE) !== null;
}

/**
 * Espace Espace, from any page (not while the first Space scrolls it): a
 * window with a new PO conversation, the dictation already listening; what is said is sent to PO when the dictation
 * ends. PO knows the page it was opened from (docs/ASSISTANT.md § 2 bis).
 */
export function AssistantLauncher() {
  const t = fr.assistant.launcher;
  const { launcherOpen, setLauncherOpen } = useAssistant();
  const lastSpace = useRef(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const plain =
        event.key === " " &&
        !event.repeat &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey;
      if (!plain || spaceBelongsTo(event.target)) {
        lastSpace.current = 0;
        return;
      }
      // Another window or panel is open: Space stays theirs.
      if (document.querySelector("[role=dialog]")) return;
      if (event.timeStamp - lastSpace.current < DOUBLE_PRESS_MS) {
        event.preventDefault();
        lastSpace.current = 0;
        setLauncherOpen(true);
      } else {
        lastSpace.current = event.timeStamp;
      }
    };
    // The first Space scrolled the page: the second one scrolls on, it
    // does not open PO (UX test of 15/11/2026, a keyboard reader paging down).
    const onScroll = () => {
      lastSpace.current = 0;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, [setLauncherOpen]);

  return (
    <Dialog open={launcherOpen} onOpenChange={setLauncherOpen}>
      <DialogContent closeLabel={t.close} className="sm:max-w-2xl" instant>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          {/* Read by a screen reader; on screen, the listening composer
              says it (the instructions took two lines at every opening). */}
          <DialogDescription className="sr-only">
            {t.description} {t.stopHint}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted per opening: a new conversation, listening at once. */}
        {launcherOpen && <LauncherConversation />}
      </DialogContent>
    </Dialog>
  );
}

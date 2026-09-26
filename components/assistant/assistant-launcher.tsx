"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { useAssistant } from "@/components/assistant/assistant-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fr } from "@/lib/i18n/fr";

// Two presses of Space within this delay open PO.
const DOUBLE_PRESS_MS = 350;

// Space types in a field and activates a button or a link: never taken there.
const TAKES_SPACE =
  "input, textarea, select, button, a, [contenteditable], [role=button], [role=checkbox], [role=combobox], [role=menuitem], [role=option], [role=switch], [role=tab], [role=textbox]";

function spaceBelongsTo(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(TAKES_SPACE) !== null;
}

/**
 * Espace Espace, from any page: a window with a new PO conversation, the
 * dictation already listening; what is said is sent to PO when the dictation
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setLauncherOpen]);

  return (
    <Dialog open={launcherOpen} onOpenChange={setLauncherOpen}>
      <DialogContent
        closeLabel={t.close}
        className="sm:top-[12dvh] sm:max-w-2xl sm:translate-y-0"
      >
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>
            {t.description} {t.stopHint}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted per opening: a new conversation, listening at once. */}
        {launcherOpen && <LauncherConversation />}
      </DialogContent>
    </Dialog>
  );
}

// Its own conversation, bound to the page it was opened from. The page is
// only a path: the server reads what it shows, with the user's session.
function LauncherConversation() {
  const page = usePathname();
  const [chat] = useState(
    () =>
      new Chat<UIMessage>({
        transport: new DefaultChatTransport({
          api: "/api/assistant",
          body: { page },
        }),
      }),
  );
  return <AssistantPanel chat={chat} compact voiceFirst />;
}

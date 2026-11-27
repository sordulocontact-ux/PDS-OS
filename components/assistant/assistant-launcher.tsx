"use client";

import dynamic from "next/dynamic";

import { useAssistant } from "@/components/assistant/assistant-provider";
import { useKeyShortcut } from "@/components/shell/shortcuts/use-key-shortcut";
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

/**
 * Espace Espace by default (Paramètres › Raccourcis clavier), from any page
 * (not while the first Space scrolls it, useKeyShortcut): a window with a new PO conversation, the dictation already listening; what is said is sent to PO when the dictation
 * ends. PO knows the page it was opened from (docs/ASSISTANT.md § 2 bis).
 */
export function AssistantLauncher() {
  const t = fr.assistant.launcher;
  const { launcherOpen, setLauncherOpen, launcherVoice } = useAssistant();

  useKeyShortcut("assistant", () => setLauncherOpen(true));

  return (
    <Dialog open={launcherOpen} onOpenChange={setLauncherOpen}>
      <DialogContent
        side="center"
        closeLabel={t.close}
        className="sm:max-w-2xl"
        instant
      >
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          {/* Read by a screen reader; on screen, the listening composer
              says it (the instructions took two lines at every opening). */}
          <DialogDescription className="sr-only">
            {t.description} {t.stopHint}
          </DialogDescription>
        </DialogHeader>
        {/* Mounted per opening: a new conversation, listening at once. */}
        {launcherOpen && <LauncherConversation voice={launcherVoice} />}
      </DialogContent>
    </Dialog>
  );
}

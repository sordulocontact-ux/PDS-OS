"use client";

import { useChat, type Chat } from "@ai-sdk/react";
import type { FileUIPart, UIMessage } from "ai";
import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { questionOf } from "@/components/assistant/question";
import { useSharedChat } from "@/components/assistant/shared-chat";
import { AssistantThread } from "@/components/assistant/assistant-thread";
import { shortcutText } from "@/components/shell/shortcuts/shortcut-keys";
import { useShortcuts } from "@/components/shell/shortcuts/shortcuts-provider";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { assistant } from "@/lib/i18n/fr/assistant";

const fr = { assistant };

/**
 * The PO assistant (Figma "Desktop - 11"): the input. On
 * the home page a question opens the conversation page, where the tab's
 * shared conversation goes on (docs/ASSISTANT.md § 2). The Espace Espace
 * window passes its own `chat` (a new conversation), shows it in place, is
 * `compact`, and talks (`voiceFirst`).
 */
export function AssistantPanel({
  chat: ownChat,
  onNew,
  compact = false,
  voiceFirst = false,
}: {
  chat?: Chat<UIMessage>;
  // The window's « Nouvelle conversation »: a new Chat, the last one saved.
  onNew?: () => void;
  compact?: boolean;
  voiceFirst?: boolean;
}) {
  const t = fr.assistant;
  const { shortcuts } = useShortcuts();
  const router = useRouter();
  const shared = useSharedChat();
  const { messages, sendMessage, regenerate, status, stop, error } = useChat({
    chat: ownChat ?? shared,
  });
  const busy = status === "submitted" || status === "streaming";
  // Only the window shows the conversation here; home has its own page.
  const inline = compact;

  function ask(text: string, images: FileUIPart[]) {
    if (busy) return;
    void sendMessage(questionOf(text, images));
    if (!inline) router.push(routes.assistant);
  }

  return (
    <section aria-label={t.title} className="flex flex-col gap-3">
      {inline && messages.length > 0 && (
        <>
          {/* In the window's head, beside its close button (as in Claude
              and ChatGPT); the window's panel is the positioned parent. */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onNew}
            disabled={busy}
            aria-label={t.clear}
            title={t.clear}
            className="absolute top-3 right-12"
          >
            <IconPlus aria-hidden />
          </Button>
          <AssistantThread
            messages={messages}
            status={status}
            error={error}
            onRetry={() => void regenerate()}
            className="max-h-[45dvh] overflow-y-auto pr-1"
          />
        </>
      )}

      {!inline && messages.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={routes.assistant} />}
          className="self-center"
        >
          {t.conversation.resume}
        </Button>
      )}

      <AssistantComposer
        onAsk={ask}
        onStop={() => void stop()}
        busy={busy}
        compact={compact}
        voiceFirst={voiceFirst}
        autoFocus={compact}
      />
      <p className="text-center text-caption text-muted-foreground">
        {t.disclaimer}
        {!compact && (
          <>
            <br />
            {t.launcher.hint(shortcutText(shortcuts.assistant))}
          </>
        )}
      </p>
    </section>
  );
}

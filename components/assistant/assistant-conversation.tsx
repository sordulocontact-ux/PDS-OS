"use client";

import { useChat } from "@ai-sdk/react";
import { IconPlus } from "nucleo-sharp-essential";
import Link from "next/link";

import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { sharedChat } from "@/components/assistant/shared-chat";
import { AssistantSuggestions } from "@/components/assistant/assistant-suggestions";
import { AssistantThread } from "@/components/assistant/assistant-thread";
import { IconArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { assistant } from "@/lib/i18n/fr/assistant";

const fr = { assistant };

/**
 * The tab's PO conversation on its own page, opened by a question from the
 * home page or from a page (« Parler à PO »): back where it was opened
 * from, with that page's trail under the title (MKT-C2-02), else to home;
 * the title, a new conversation; the turns scroll between the header and
 * the input (docs/ASSISTANT.md § 2).
 */
export function AssistantConversation() {
  const t = fr.assistant;
  const { origin, setOrigin } = useAssistant();
  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    chat: sharedChat(),
  });
  const busy = status === "submitted" || status === "streaming";
  // The title is the first question, as asked: no model writes it.
  const first = messages.find((m) => m.role === "user");
  const title =
    first?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ||
    t.conversation.new;

  function ask(text: string) {
    if (!busy) void sendMessage({ text });
  }

  function restart() {
    if (busy) void stop();
    setMessages([]);
    setOrigin(null);
  }

  return (
    // Fills the screen under the mobile header, or inside the shell inset.
    <div className="flex h-[calc(100dvh-3.5rem)] animate-in flex-col duration-[var(--duration-fast)] fade-in-0 motion-reduce:animate-none md:h-[calc(100dvh-2*var(--shell-inset))]">
      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 md:px-[var(--page-gutter)] md:py-6">
        <Button
          variant="outline"
          size="icon"
          nativeButton={false}
          render={<Link href={origin?.href ?? routes.app} />}
          aria-label={origin ? t.conversation.backTo : t.conversation.back}
        >
          <IconArrowLeft aria-hidden className="size-5" />
        </Button>
        <div className="flex min-w-0 flex-col items-center gap-0.5">
          <h1 className="w-full truncate text-center text-body-lg font-medium">
            {title}
          </h1>
          {origin && (
            <Link
              href={origin.href}
              className="max-w-full truncate rounded-sm text-caption text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              <span className="sr-only">{t.conversation.backTo} : </span>
              {origin.trail.join(" › ")}
            </Link>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={restart}
          disabled={messages.length === 0}
          aria-label={t.conversation.new}
        >
          <IconPlus aria-hidden className="size-5" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 md:px-[var(--page-gutter)]">
        {messages.length > 0 ? (
          <AssistantThread
            messages={messages}
            status={status}
            error={error}
            className="mx-auto w-full max-w-4xl py-6"
          />
        ) : (
          <div className="mx-auto flex h-full w-full max-w-4xl items-end justify-center pb-6">
            <AssistantSuggestions onAsk={ask} disabled={busy} />
          </div>
        )}
      </div>

      <div className="px-4 pb-4 md:px-[var(--page-gutter)] md:pb-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          <AssistantComposer
            onAsk={ask}
            onStop={() => void stop()}
            busy={busy}
            compact
            autoFocus
            placeholder={
              messages.length > 0 ? t.conversation.reply : t.placeholder
            }
          />
          <p className="text-center text-caption text-muted-foreground">
            {t.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}

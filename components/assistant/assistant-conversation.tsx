"use client";

import { useChat } from "@ai-sdk/react";
import { IconPlus, IconUnorderedList } from "nucleo-sharp-essential";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { AssistantThread } from "@/components/assistant/assistant-thread";
import { ConversationHistory } from "@/components/assistant/conversation-history";
import {
  startSharedChat,
  useConversationChat,
} from "@/components/assistant/shared-chat";
import { IconArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { conversationTitle } from "@/lib/assistant/conversation-title";
import type {
  ConversationSummary,
  SavedConversation,
} from "@/lib/assistant/conversations";
import { routes } from "@/lib/auth/redirects";
import { assistant } from "@/lib/i18n/fr/assistant";

const fr = { assistant };

/**
 * PO's page (« PO » in the sidebar): the conversation, and beside it the
 * history of the viewer's conversations (a drawer on a phone). Opened on
 * the tab's conversation, or on `saved`, reopened from the history. Back
 * where it was opened from, with that page's trail under the title
 * (MKT-C2-02), else to home; the title is the first question; « + », a new
 * conversation (docs/ASSISTANT.md § 2 and § 2 ter).
 */
export function AssistantConversation({
  conversations,
  saved,
}: {
  conversations: ConversationSummary[];
  saved?: SavedConversation;
}) {
  const t = fr.assistant;
  const router = useRouter();
  const pathname = usePathname();
  const { origin, setOrigin } = useAssistant();
  const chat = useConversationChat(saved);
  const { messages, sendMessage, status, stop, error } = useChat({ chat });
  const busy = status === "submitted" || status === "streaming";
  const title =
    conversationTitle(messages) ?? saved?.title ?? t.conversation.new;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleted, setDeleted] = useState<string[]>([]);

  // Once its first answer is in (and saved), the address names the
  // conversation: a reload or a bookmark finds it again.
  const started = messages.length > 0;
  useEffect(() => {
    if (status === "ready" && started && pathname === routes.assistant)
      window.history.replaceState(
        null,
        "",
        routes.assistantConversation(chat.id),
      );
  }, [status, started, pathname, chat.id]);

  // The history read by the server, and this conversation at its top before
  // the server has it.
  const known = conversations.some((c) => c.id === chat.id);
  const items = (
    known || !conversationTitle(messages)
      ? conversations
      : [{ id: chat.id, title, at: new Date().toISOString() }, ...conversations]
  ).filter((c) => !deleted.includes(c.id));

  function ask(text: string) {
    if (!busy) void sendMessage({ text });
  }

  function restart() {
    if (busy) void stop();
    startSharedChat();
    setOrigin(null);
    if (pathname !== routes.assistant) router.push(routes.assistant);
  }

  function onDeleted(id: string) {
    setDeleted((previous) => [...previous, id]);
    if (id === chat.id) restart();
  }

  // Drawn twice (beside, and in the phone's drawer): ids kept apart.
  const history = (idPrefix: string) => (
    <ConversationHistory
      idPrefix={idPrefix}
      items={items}
      activeId={chat.id}
      onNavigate={() => setHistoryOpen(false)}
      onDeleted={onDeleted}
    />
  );

  return (
    // Fills the screen under the mobile header, or inside the shell inset.
    <div className="flex h-[calc(100dvh-3.5rem)] animate-in duration-[var(--duration-fast)] fade-in-0 motion-reduce:animate-none md:h-[calc(100dvh-2*var(--shell-inset))]">
      <aside
        aria-labelledby="po-history-title"
        className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto overscroll-contain border-r px-3 py-6 md:flex"
      >
        <h2 id="po-history-title" className="px-4 text-body-md font-medium">
          {t.history.title}
        </h2>
        {history("po-history")}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setHistoryOpen(true)}
              aria-label={t.history.open}
              className="md:hidden"
            >
              <IconUnorderedList aria-hidden className="size-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={restart}
              disabled={!started}
              aria-label={t.conversation.new}
            >
              <IconPlus aria-hidden className="size-5" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 md:px-[var(--page-gutter)]">
          {started && (
            <AssistantThread
              messages={messages}
              status={status}
              error={error}
              className="mx-auto w-full max-w-4xl py-6"
            />
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
              placeholder={started ? t.conversation.reply : t.placeholder}
            />
            <p className="text-center text-caption text-muted-foreground">
              {t.disclaimer}
            </p>
          </div>
        </div>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="gap-4 overflow-y-auto px-3 py-4">
          <SheetHeader className="px-4 py-0">
            <SheetTitle>{t.history.title}</SheetTitle>
          </SheetHeader>
          {history("po-history-drawer")}
        </SheetContent>
      </Sheet>
    </div>
  );
}

"use client";

import { useChat } from "@ai-sdk/react";
import { IconPlus } from "nucleo-sharp-essential";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { AssistantThread } from "@/components/assistant/assistant-thread";
import { ConversationHeader } from "@/components/assistant/conversation-header";
import { ConversationHistory } from "@/components/assistant/conversation-history";
import { ConversationStart } from "@/components/assistant/conversation-start";
import {
  startSharedChat,
  useConversationChat,
} from "@/components/assistant/shared-chat";
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
 * PO's page (« PO » in the sidebar): the history of the viewer's
 * conversations beside the conversation (a drawer on a phone), « Nouvelle
 * conversation » at its top. A new conversation starts with the question box
 * in the middle (ConversationStart); once asked, its title (the first
 * question) heads the page. Opened from a page, a link goes back to it, with
 * that page's trail (MKT-C2-02) (docs/ASSISTANT.md § 2 and § 2 ter).
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
  const { messages, sendMessage, regenerate, status, stop, error } = useChat({
    chat,
  });
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
        className="hidden w-64 shrink-0 flex-col border-r md:flex"
      >
        <div className="px-3 pt-6 pb-4">
          <Button
            variant="outline"
            onClick={restart}
            disabled={!started}
            className="w-full justify-start"
          >
            <IconPlus aria-hidden className="size-5" />
            {t.conversation.new}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
          <h2 id="po-history-title" className="sr-only">
            {t.history.title}
          </h2>
          {history("po-history")}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <ConversationHeader
          title={started ? title : null}
          origin={origin}
          onHistory={() => setHistoryOpen(true)}
          onNew={restart}
        />

        {started ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 md:px-[var(--page-gutter)]">
              <AssistantThread
                messages={messages}
                status={status}
                error={error}
                onRetry={() => void regenerate()}
                className="mx-auto w-full max-w-3xl pt-2 pb-8"
              />
            </div>
            <div className="px-4 pb-4 md:px-[var(--page-gutter)] md:pb-6">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
                <AssistantComposer
                  onAsk={ask}
                  onStop={() => void stop()}
                  busy={busy}
                  compact
                  autoFocus
                  placeholder={t.conversation.reply}
                />
                <p className="text-center text-caption text-muted-foreground">
                  {t.disclaimer}
                </p>
              </div>
            </div>
          </>
        ) : (
          <ConversationStart
            onAsk={ask}
            onStop={() => void stop()}
            busy={busy}
          />
        )}
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

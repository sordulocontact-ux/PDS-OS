"use client";

import { AssistantComposer } from "@/components/assistant/assistant-composer";
import { assistant } from "@/lib/i18n/fr/assistant";

const fr = { assistant };

/**
 * A new conversation on PO's page: the question box in the middle of the
 * page, as on home (no suggestion pills: removed by Sacha on 29/10 until a
 * better presentation). Once asked, the conversation takes the page and the
 * box goes to its foot.
 */
export function ConversationStart({
  onAsk,
  onStop,
  busy,
}: {
  onAsk: (question: string) => void;
  onStop: () => void;
  busy: boolean;
}) {
  const t = fr.assistant;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 md:px-[var(--page-gutter)]">
      {/* Centred while it fits, scrolled from the top when it does not. */}
      <div className="m-auto flex w-full max-w-3xl flex-col gap-6 py-10">
        <h1 className="text-center font-display text-display-md text-balance text-foreground">
          {t.title}
        </h1>
        <AssistantComposer
          onAsk={onAsk}
          onStop={onStop}
          busy={busy}
          autoFocus
        />
        <p className="text-center text-caption text-muted-foreground">
          {t.disclaimer}
        </p>
      </div>
    </div>
  );
}

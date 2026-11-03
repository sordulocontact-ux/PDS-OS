"use client";

import Link from "next/link";

import { navItemActiveClass, navItemClass } from "@/components/shell/nav-item";
import { DayGroups } from "@/components/ui/day-groups";
import { RecordMenu } from "@/components/ui/record-menu";
import { deleteConversation } from "@/lib/assistant/conversation-actions";
import type { ConversationSummary } from "@/lib/assistant/conversations";
import { routes } from "@/lib/auth/redirects";
import { assistant } from "@/lib/i18n/fr/assistant";
import { cn } from "@/lib/utils";

const fr = { assistant };

/**
 * The viewer's conversations with PO, newest first, by day (docs/
 * ASSISTANT.md § 2 ter): a link reopens one where it stopped, « ⋯ » deletes
 * it. Beside the conversation on a wide screen, in a drawer on a phone.
 */
export function ConversationHistory({
  idPrefix,
  items,
  activeId,
  onNavigate,
  onDeleted,
}: {
  idPrefix: string;
  items: ConversationSummary[];
  activeId: string;
  onNavigate?: () => void;
  onDeleted: (id: string) => void;
}) {
  const t = fr.assistant.history;
  if (items.length === 0)
    return <p className="px-4 text-caption text-muted-foreground">{t.empty}</p>;

  return (
    <DayGroups items={items} idPrefix={idPrefix} keyOf={(item) => item.id}>
      {(item) => {
        const active = item.id === activeId;
        return (
          <div className="group relative flex items-center">
            <Link
              href={routes.assistantConversation(item.id)}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={item.title}
              className={cn(
                navItemClass,
                "min-w-0 flex-1 pr-10",
                active && navItemActiveClass,
              )}
            >
              <span className="truncate">{item.title}</span>
            </Link>
            {/* Shown on hover with a mouse, always on a touch screen. */}
            <div className="absolute right-1 transition-opacity duration-[var(--duration-fast)] group-focus-within:opacity-100 group-hover:opacity-100 has-[[data-popup-open]]:opacity-100 [@media(hover:hover)]:opacity-0">
              <RecordMenu
                label={t.actions(item.title)}
                remove={{
                  title: t.deleteTitle,
                  body: t.deleteBody,
                  done: t.deleted,
                  run: async () => {
                    const result = await deleteConversation(item.id);
                    if (result.ok) onDeleted(item.id);
                    return result;
                  },
                }}
              />
            </div>
          </div>
        );
      }}
    </DayGroups>
  );
}

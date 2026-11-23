"use client";

import { IconEnvelopeOpen } from "nucleo-sharp-essential";
import { useSearchParams } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";

import { MailListItem } from "@/components/mailbox/mail-list-item";
import { MailReader } from "@/components/mailbox/mail-reader";
import { EmptyState } from "@/components/shell/empty-state";
import { SideSheet } from "@/components/ui/side-sheet";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { mailbox } from "@/lib/i18n/fr/mailbox";
import type { MailboxMessage } from "@/lib/mailbox/types";

const fr = { mailbox };

// From `lg`, the mail opens beside the list; under it, in the side sheet.
const WIDE = "(min-width: 64rem)";

/**
 * The mails as a mail app shows them (Outlook, Sacha 23/11/2026): the list
 * on the left, the mail open on the right, the first one open at once; ↑ ↓
 * in the list go to the mail before or after. On a phone there is no room
 * beside the list: the mail opens in the side sheet, as any row of the app.
 * The mail open is kept by its id (?ouvrir=<id> opens one), so a search
 * that changes the list never opens another one.
 */
export function MailInbox({ messages }: { messages: MailboxMessage[] }) {
  const t = fr.mailbox;
  const wide = useMediaQuery(WIDE);
  const wanted = useSearchParams().get("ouvrir");
  const [openId, setOpenId] = useState<string | null>(wanted);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const found = openId ? messages.findIndex((m) => m.id === openId) : -1;
  // Beside the list, the first mail is read until another one is chosen.
  const index = found >= 0 ? found : wide && messages.length > 0 ? 0 : null;
  const open = index !== null ? messages[index] : undefined;

  const moveTo = (to: number) => {
    const next = messages[to];
    if (!next) return;
    setOpenId(next.id);
    buttons.current.get(next.id)?.focus();
  };
  const onKeyDown = (from: number) => (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveTo(from + (event.key === "ArrowDown" ? 1 : -1));
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(16rem,2fr)_minmax(0,3fr)] lg:items-start lg:gap-6">
      <ul
        aria-label={t.reader.listLabel}
        className="-mx-3 flex flex-col gap-0.5"
      >
        {messages.map((message, i) => (
          <MailListItem
            key={message.id}
            message={message}
            open={i === index}
            onOpen={() => setOpenId(message.id)}
            onKeyDown={onKeyDown(i)}
            buttonRef={(node) => {
              if (node) buttons.current.set(message.id, node);
              else buttons.current.delete(message.id);
            }}
          />
        ))}
      </ul>
      {wide ? (
        <section
          aria-label={open?.subject || t.reader.pickTitle}
          className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg border border-[color:var(--border-hairline)] bg-card p-6 classic:top-6 classic:max-h-[calc(100dvh-3rem)]"
        >
          {open ? (
            <MailReader key={open.id} message={open} />
          ) : (
            <EmptyState
              icon={IconEnvelopeOpen}
              title={t.reader.pickTitle}
              body={t.reader.pickBody}
            />
          )}
        </section>
      ) : (
        open &&
        index !== null && (
          <SideSheet
            open
            onClose={() => setOpenId(null)}
            title={open.subject || t.noSubject}
            index={index}
            total={messages.length}
            onMove={moveTo}
          >
            <MailReader key={open.id} message={open} subject={false} />
          </SideSheet>
        )
      )}
    </div>
  );
}

"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import type { KeyboardEvent, Ref } from "react";

import { MailAvatar } from "@/components/mailbox/mail-avatar";
import { correspondentOf } from "@/components/mailbox/mail-people";
import { MailKindBadges } from "@/components/mailbox/mail-kind-badges";
import { Timestamp } from "@/components/ui/timestamp";
import { mailbox } from "@/lib/i18n/fr/mailbox";
import type { MailboxMessage } from "@/lib/mailbox/types";
import { cn } from "@/lib/utils";

const fr = { mailbox };

/**
 * One mail of the list, as a mail app draws it (Outlook, Sacha 23/11/2026):
 * the sender's icon; who (strongest) and the day; the subject with its
 * files; the start of the text, faint; its types. No rule between mails: a
 * mailbox, not a table. The mail open is grey (docs/DESIGN.md § 3 bis, a
 * row opened in place), never blue.
 */
export function MailListItem({
  message,
  open,
  onOpen,
  onKeyDown,
  buttonRef,
}: {
  message: MailboxMessage;
  open: boolean;
  onOpen: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const t = fr.mailbox;
  return (
    <li>
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        onKeyDown={onKeyDown}
        aria-current={open ? "true" : undefined}
        className={cn(
          "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none hover:bg-[var(--control-bg-hover)] focus-visible:bg-[var(--control-bg-hover)]",
          open && "bg-[var(--surface-sunken)] hover:bg-[var(--surface-sunken)]",
        )}
      >
        <MailAvatar message={message} className="mt-0.5" />
        <span className="flex min-w-0 flex-1 flex-col">
          {/* Who first and strongest, then what, then the start of it. */}
          <span className="flex min-w-0 items-baseline gap-3">
            <span className="min-w-0 flex-1 truncate font-semibold">
              {correspondentOf(message)}
            </span>
            <Timestamp
              iso={message.sentAt}
              show="short"
              className="shrink-0 text-[length:var(--type-caption)] text-[color:var(--text-tertiary)]"
            />
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
            <span className="min-w-0 flex-1 truncate">
              {message.subject || t.noSubject}
            </span>
            {message.attachments.length > 0 && (
              <IconPaperclip
                aria-label={t.attachmentsLabel(message.attachments.length)}
                className="size-3.5 shrink-0 text-[color:var(--text-tertiary)]"
              />
            )}
          </span>
          {message.snippet && (
            <span className="truncate text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]">
              {message.snippet}
            </span>
          )}
          {message.kinds.length > 0 && (
            <span className="mt-1 flex flex-wrap gap-1">
              <MailKindBadges message={message} />
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

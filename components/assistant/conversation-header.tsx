"use client";

import { IconPlus, IconUnorderedList } from "nucleo-sharp-essential";
import Link from "next/link";

import type { PoOrigin } from "@/components/assistant/assistant-provider";
import { IconArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { assistant } from "@/lib/i18n/fr/assistant";
import { cn } from "@/lib/utils";

const fr = { assistant };

/**
 * The head of PO's page: the conversation's title (its first question), and
 * above it the way back to the page PO was opened from. On a phone, the
 * history and « Nouvelle conversation » buttons, which sit in the history
 * column on a wide screen; there, nothing is shown until there is a title or
 * a way back.
 */
export function ConversationHeader({
  title,
  origin,
  onHistory,
  onNew,
}: {
  // Null before the first question.
  title: string | null;
  origin: PoOrigin | null;
  onHistory: () => void;
  onNew: () => void;
}) {
  const t = fr.assistant;
  return (
    <header
      className={cn(
        "flex min-h-16 items-center px-4 py-3 md:px-[var(--page-gutter)] md:py-5",
        !title && !origin && "md:hidden",
      )}
    >
      {/* Lined up with the conversation's column. */}
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={onHistory}
          aria-label={t.history.open}
          className="md:hidden"
        >
          <IconUnorderedList aria-hidden className="size-5 modern:size-4" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {origin && (
            <Link
              href={origin.href}
              className="flex w-fit max-w-full items-center gap-1 rounded-sm text-caption text-muted-foreground hover:text-foreground"
            >
              <IconArrowLeft aria-hidden className="size-4 shrink-0" />
              <span className="sr-only">{t.conversation.backTo} : </span>
              <span className="truncate">{origin.trail.join(" › ")}</span>
            </Link>
          )}
          {title && (
            <h1 className="truncate text-body-md font-medium" title={title}>
              {title}
            </h1>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onNew}
          disabled={!title}
          aria-label={t.conversation.new}
          className="md:hidden"
        >
          <IconPlus aria-hidden className="size-5 modern:size-4" />
        </Button>
      </div>
    </header>
  );
}

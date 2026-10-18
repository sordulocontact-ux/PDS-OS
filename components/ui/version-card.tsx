"use client";

import { IconChevronRight } from "nucleo-sharp-essential";
import { useState, type ReactNode } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/ui/state-tones";

/**
 * One version, one group or one sheet that folds (docs/VISION-UX.md rule
 * 17, proto `versionCard`): a native <details>, the chevron on the left
 * turning a quarter when open, the title, its state pill, the meta pushed
 * to the right (« Généré par … le … », « 1 à confirmer »). `defaultOpen`:
 * the last version and the retained one, a group with something to decide.
 * Open or closed is then the person's: kept when the page is read again
 * after an action (give the card a stable `key`).
 */
export function VersionCard({
  title,
  status,
  meta,
  defaultOpen = false,
  headingLevel = 3,
  id,
  className,
  children,
}: {
  title: ReactNode;
  status?: { tone: Tone; label: string } | null;
  meta?: ReactNode;
  defaultOpen?: boolean;
  headingLevel?: 2 | 3 | 4;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Heading = `h${headingLevel}` as const;
  return (
    <details
      id={id}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={cn(
        "min-w-0 rounded-2xl border border-[color:var(--border-hairline)] bg-card",
        className,
      )}
    >
      <summary className="flex min-h-13 cursor-pointer list-none flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-2xl px-3.5 py-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)] [&::-webkit-details-marker]:hidden">
        <IconChevronRight
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground transition-transform duration-[var(--duration-base)] ease-[var(--ease-standard)] [details[open]>summary>&]:rotate-90 [summary:hover>&]:text-foreground motion-reduce:transition-none"
        />
        <Heading className="min-w-0 text-body-md font-semibold tracking-[var(--type-body-tracking)] break-words">
          {title}
        </Heading>
        {status && (
          <StatusBadge tone={status.tone} size="sm">
            {status.label}
          </StatusBadge>
        )}
        {meta && (
          <span className="ml-auto text-caption text-[color:var(--text-secondary)]">
            {meta}
          </span>
        )}
      </summary>
      <div className="flex flex-col gap-3 px-4 pt-1 pb-4">{children}</div>
    </details>
  );
}

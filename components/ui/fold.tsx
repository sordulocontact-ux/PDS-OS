import { IconChevronRight } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Something kept folded under a text link (proto `details.infos`: « Voir
 * le détail ›»): the summary and a chevron that turns, the content below.
 * A native <details>, no state. For a version or a group with a state and
 * a frame, use VersionCard.
 */
export function Fold({
  summary,
  defaultOpen = false,
  className,
  children,
}: {
  summary: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className={cn("group min-w-0", className)}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold text-[color:var(--text-secondary)] outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)] [&::-webkit-details-marker]:hidden">
        {summary}
        <IconChevronRight
          aria-hidden
          className="size-4 transition-transform duration-[var(--duration-base)] ease-[var(--ease-standard)] group-open:rotate-90 motion-reduce:transition-none"
        />
      </summary>
      <div className="flex flex-col gap-3 pt-3">{children}</div>
    </details>
  );
}

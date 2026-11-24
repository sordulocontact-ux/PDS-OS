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
  variant = "link",
  className,
  children,
}: {
  summary: ReactNode;
  defaultOpen?: boolean;
  // `row`: a whole line that opens its list, the chevron at its end (a
  // count of a record's side sheet: « Parties 2 ›», Sacha 24/11/2026).
  variant?: "link" | "row";
  className?: string;
  children: ReactNode;
}) {
  const row = variant === "row";
  return (
    <details open={defaultOpen} className={cn("group min-w-0", className)}>
      <summary
        className={cn(
          "cursor-pointer list-none items-center rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)] [&::-webkit-details-marker]:hidden",
          row
            ? "flex w-full gap-2.5"
            : "inline-flex gap-1.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold text-[color:var(--text-secondary)] hover:text-foreground",
        )}
      >
        {summary}
        <IconChevronRight
          aria-hidden
          className={cn(
            "size-4 shrink-0 transition-transform duration-[var(--duration-base)] ease-[var(--ease-standard)] group-open:rotate-90 motion-reduce:transition-none",
            row && "text-[color:var(--text-secondary)]",
          )}
        />
      </summary>
      <div className={cn("flex flex-col pt-3", row ? "gap-2" : "gap-3")}>
        {children}
      </div>
    </details>
  );
}

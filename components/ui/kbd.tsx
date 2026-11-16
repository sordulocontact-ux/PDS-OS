import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A key of the keyboard named on screen (« ↑ », « Échap », « ⌘K »): an
 * outlined cap in the micro size. `raised`: a key to press now (the
 * onboarding's shortcuts), on the raised surface with a thicker bottom edge.
 */
export function Kbd({
  children,
  raised = false,
  className,
}: {
  children: ReactNode;
  raised?: boolean;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-grid h-6 min-w-6 place-items-center rounded-md border border-[color:var(--border-default)] px-1.5 font-[inherit] text-[length:var(--type-micro)] leading-none",
        raised
          ? "border-b-2 bg-[var(--surface-raised)] px-2 text-[color:var(--text-primary)]"
          : "text-[color:var(--text-secondary)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

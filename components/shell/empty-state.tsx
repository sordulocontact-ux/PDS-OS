import type { ComponentType } from "react";

import type { IconProps } from "nucleo-sharp-essential";

import { cn } from "@/lib/utils";

// EmptyState (docs/DESIGN.md § 7): 22 px icon, title, one instruction, and
// the creation action when the viewer may create. With `onClick`, the whole
// frame is the action (a file library's drop zone: click anywhere to pick).
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  onClick,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  body: string;
  action?: React.ReactNode;
  onClick?: () => void;
}) {
  const frame =
    "flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-border px-4 py-16 text-center bg-card";
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          frame,
          "cursor-pointer transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] outline-none hover:bg-[var(--control-bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]",
        )}
      >
        <Icon className="size-[22px] text-muted-foreground" aria-hidden />
        <span className="text-base font-medium">{title}</span>
        <span className="max-w-sm text-sm text-muted-foreground">{body}</span>
      </button>
    );
  return (
    <div className={frame}>
      <Icon className="size-[22px] text-muted-foreground" aria-hidden />
      <h2 className="text-base font-medium">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// A list still empty inside a section (contacts, tracks, shares): one line
// in the same dashed frame, without icon or title.
export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    // On a section card, a plain line: no frame inside a card.
    <p className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground in-[.section-card]:border-0 in-[.section-card]:p-0">
      {children}
    </p>
  );
}

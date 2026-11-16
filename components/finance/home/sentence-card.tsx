import type { ComponentType, ReactNode } from "react";

import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

const frame =
  "flex min-h-56 min-w-0 flex-col gap-3 rounded-2xl border border-[color:var(--border-hairline)] p-[18px] text-left no-underline";

/**
 * A card of Finance's overview (new style, docs/FINANCE-V2.md, after
 * Midday): its subject with an icon, one sentence where the figures are in
 * bold (`<Strong>`), then a figure or a small chart at the foot, and what a
 * click opens. The whole card is the link; `href` absent, it only says
 * (the brief), on a tinted ground.
 */
export function SentenceCard({
  icon: Icon,
  title,
  href,
  foot,
  children,
  figure,
  visual,
}: {
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  href?: string;
  // What a click opens, or the source of what the card says.
  foot: string;
  // The sentence.
  children: ReactNode;
  // A figure in large, at the foot.
  figure?: { text: string; tone?: "danger" };
  // A small chart, at the foot.
  visual?: ReactNode;
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-caption text-[color:var(--text-secondary)]">
        {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
        {title}
      </span>
      <p className="text-body-md text-pretty text-[color:var(--text-secondary)]">
        {children}
      </p>
      <span className="mt-auto flex flex-col gap-3">
        {figure && (
          <span
            className={cn(
              "text-display-md tabular-nums",
              figure.tone === "danger"
                ? "text-[color:var(--error)]"
                : "text-[color:var(--text-primary)]",
            )}
          >
            {figure.text}
          </span>
        )}
        {visual}
        <span className="text-caption text-[color:var(--text-tertiary)]">
          {foot}
        </span>
      </span>
    </>
  );
  if (!href)
    return <div className={cn(frame, "bg-[var(--surface-soft)]")}>{body}</div>;
  return (
    <ViewLink
      href={href}
      className={cn(
        frame,
        "bg-card text-inherit transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[color:var(--border-default)] hover:bg-[var(--surface-soft)]",
      )}
    >
      {body}
    </ViewLink>
  );
}

/** A figure in bold inside a card's sentence. */
export function Strong({ children }: { children: ReactNode }) {
  return (
    <strong className="font-semibold text-[color:var(--text-primary)] tabular-nums">
      {children}
    </strong>
  );
}

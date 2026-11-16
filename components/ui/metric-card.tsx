import type { ReactNode } from "react";

import { CountBadge } from "@/components/ui/count-badge";
import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

/**
 * A figure and what details it, on its own card (Finance, after Midday,
 * Sacha 13/11/2026): the small grey title, the figure large, one caption
 * line, a legend if a curve follows, then the details (a curve, a few
 * rows). Every card of a page has the same anatomy, so the eye reads the
 * figures first and the details after.
 *
 * `href` with no children: the whole card opens the list behind the figure
 * (a stretched link); `current`: it is the filter the page shows, in ink.
 * A card with children keeps its links inside (`action`, rows).
 */
export function MetricCard({
  title,
  value,
  count,
  caption,
  legend,
  action,
  href,
  current = false,
  size = "md",
  danger = false,
  className,
  children,
}: {
  title: string;
  // No figure: a card of rows with the same header (« À surveiller »).
  value?: string;
  // Things waiting in a card of rows; read with the title.
  count?: number;
  caption?: ReactNode;
  legend?: ReactNode;
  // In the header, right: a link to the whole list, a choice of period.
  action?: ReactNode;
  href?: string;
  current?: boolean;
  // `lg`: the page's main figure (the balance of the account).
  size?: "md" | "lg";
  // The figure is a problem (late money): said in red, with its caption.
  danger?: boolean;
  // Grid placement only (a wider card), never a restyle.
  className?: string;
  children?: ReactNode;
}) {
  const linked = href !== undefined && children === undefined;
  return (
    <section
      className={cn(
        "relative flex min-w-0 flex-col gap-5 rounded-2xl border border-border bg-card p-5",
        linked &&
          "transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted",
        current && "border-foreground bg-muted",
        className,
      )}
    >
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
        <h2
          className="text-caption text-[color:var(--text-secondary)]"
          aria-label={count ? `${title}, ${count}` : undefined}
        >
          {linked ? (
            <ViewLink
              href={href}
              aria-current={current || undefined}
              className="text-[color:inherit] outline-none after:absolute after:inset-0 after:rounded-2xl"
            >
              {title}
            </ViewLink>
          ) : (
            title
          )}
        </h2>
        {count ? <CountBadge count={count} /> : null}
        </div>
        {action}
      </div>
      {value !== undefined && (
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "tabular-nums",
            size === "lg" ? "text-display-lg" : "text-display-md",
          )}
        >
          {/* Its own element: cn keeps one text-* class, size or colour. */}
          <span className={danger ? "text-[color:var(--error)]" : undefined}>
            {value}
          </span>
        </p>
        {caption && (
          <p className="text-caption text-[color:var(--text-secondary)]">
            {caption}
          </p>
        )}
      </div>
      )}
      {legend}
      {children}
    </section>
  );
}

/** The link of a card's header, to the whole list (« Tout voir »). */
export function MetricCardLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <ViewLink
      href={href}
      className="text-caption text-[color:var(--text-secondary)] underline-offset-4 hover:text-foreground hover:underline"
    >
      {children}
    </ViewLink>
  );
}

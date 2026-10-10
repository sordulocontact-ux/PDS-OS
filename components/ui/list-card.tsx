import Link from "next/link";
import type { ReactNode } from "react";

import { CountBadge } from "@/components/ui/count-badge";
import { cn } from "@/lib/utils";

/**
 * Card of short linked rows (Figma "Desktop - 11"), used by the home and the
 * work page: a small grey label, an optional count and link, then the rows or
 * an empty line.
 */
export function ListCard({
  title,
  count,
  action,
  empty,
  error,
  className,
  children,
}: {
  title: string;
  // Things waiting in this card; the number is read with the title.
  count?: number;
  action?: { label: string; href: string };
  empty?: string;
  // The rows could not be read: said instead of a false « nothing ».
  error?: string;
  // Grid placement only (a wider card), never a restyle.
  className?: string;
  children?: ReactNode;
}) {
  const counted = count !== undefined && count > 0;
  return (
    <section
      className={cn(
        "flex flex-col gap-6 rounded-2xl border border-border p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2
            className="text-caption text-grey-400"
            aria-label={counted ? `${title}, ${count}` : undefined}
          >
            {title}
          </h2>
          {counted && <CountBadge count={count} />}
        </div>
        {action && (
          <Link
            href={action.href}
            className="text-caption text-muted-foreground underline-offset-4 hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-body-md text-error">
          {error}
        </p>
      ) : empty ? (
        <p className="text-body-md text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid gap-1">{children}</ul>
      )}
    </section>
  );
}

/**
 * One line of a card: main text linked to its page, secondary text below.
 * `leading` sits before the link, outside it (a checkbox stays its own control).
 */
export function CardRow({
  href,
  main,
  sub,
  badge,
  leading,
}: {
  href: string;
  main: string;
  sub?: string;
  badge?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <li className={cn(leading && "flex items-start gap-2")}>
      {leading}
      <Link
        href={href}
        className={cn(
          "-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-1 hover:bg-[var(--control-bg-hover)]",
          leading && "mx-0 min-w-0 flex-1",
        )}
      >
        {/* Never cut: a long title wraps, the badge keeps its width. */}
        <span className="grid min-w-0 gap-1 text-body-md text-ink-800">
          <span className="font-semibold break-words">{main}</span>
          {sub && <span className="break-words">{sub}</span>}
        </span>
        {badge && <span className="shrink-0">{badge}</span>}
      </Link>
    </li>
  );
}

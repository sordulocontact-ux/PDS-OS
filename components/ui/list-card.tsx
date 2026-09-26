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
  className,
  children,
}: {
  title: string;
  // Things waiting in this card; the number is read with the title.
  count?: number;
  action?: { label: string; href: string };
  empty?: string;
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
      {empty ? (
        <p className="text-body-md text-muted-foreground">{empty}</p>
      ) : (
        <ul className="grid gap-1">{children}</ul>
      )}
    </section>
  );
}

/** One line of a card: main text linked to its page, secondary text below. */
export function CardRow({
  href,
  main,
  sub,
  badge,
}: {
  href: string;
  main: string;
  sub?: string;
  badge?: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-1 hover:bg-[var(--control-bg-hover)]"
      >
        <span className="grid min-w-0 gap-1 text-body-md text-ink-800">
          <span className="truncate font-semibold">{main}</span>
          {sub && <span className="truncate">{sub}</span>}
        </span>
        {badge}
      </Link>
    </li>
  );
}

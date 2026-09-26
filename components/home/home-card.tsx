import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Frame shared by the home cards (Figma "Desktop - 11"): a small grey label,
 * an optional link, then a short list of rows or an empty line.
 */
export function HomeCard({
  title,
  action,
  empty,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  empty?: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-caption text-grey-400">{title}</h2>
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

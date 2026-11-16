import { IconChevronRight } from "nucleo-sharp-essential";
import Link from "next/link";
import type { ReactNode } from "react";

import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]";

/**
 * A block of the home (proto `docs/protos/accueil.html`): its title and
 * count above, a link to the full list on the right, then the framed list.
 */
export function HomeSection({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count?: number;
  action?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2
          className={cn(
            caption,
            "font-semibold text-[color:var(--text-secondary)]",
          )}
        >
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-1.5 font-medium text-[color:var(--text-tertiary)] tabular-nums">
              {count}
            </span>
          )}
        </h2>
        {action && (
          <Link
            href={action.href}
            className={cn(
              caption,
              "text-foreground underline decoration-[color:var(--border-hover)] underline-offset-[3px]",
              // The new style: a grey link, underlined on hover (MetricCardLink).
              "modern:text-[color:var(--text-secondary)] modern:no-underline modern:hover:underline",
            )}
          >
            {action.label}
          </Link>
        )}
      </div>
      <ul className="overflow-hidden rounded-xl border border-[color:var(--border-default)] bg-card [&>li+li]:border-t [&>li+li]:border-[color:var(--border-hairline)]">
        {children}
      </ul>
    </section>
  );
}

/** One row: the whole line opens `href`, the chevron says so. `leading`
 * (an avatar) before the text, `badges` before the chevron. */
export function HomeRow({
  href,
  leading,
  badges,
  className,
  children,
}: {
  href: string;
  leading?: ReactNode;
  badges?: ReactNode;
  // A grid of columns (« Vos projets »), never a restyle.
  className?: string;
  children: ReactNode;
}) {
  return (
    <li>
      <ViewLink
        href={href}
        className={cn(
          "flex items-center gap-3 px-4 py-3 text-foreground no-underline transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)]",
          className,
        )}
      >
        {leading}
        {children}
        {badges && (
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {badges}
          </span>
        )}
        <IconChevronRight
          aria-hidden
          className="size-4 shrink-0 text-[color:var(--text-tertiary)]"
        />
      </ViewLink>
    </li>
  );
}

/** The text of a row: a semi-bold line, then where and when. */
export function HomeRowText({ main, sub }: { main: ReactNode; sub?: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] break-words">
        {main}
      </span>
      {sub && (
        <span
          className={cn(
            caption,
            "break-words text-[color:var(--text-secondary)]",
          )}
        >
          {sub}
        </span>
      )}
    </span>
  );
}

/** The last line of a list: how many more, and where they are. */
export function HomeListNote({ children }: { children: ReactNode }) {
  return (
    <li
      className={cn(
        caption,
        "px-4 py-2.5 text-[color:var(--text-secondary)] modern:py-2",
      )}
    >
      {children}
    </li>
  );
}

/** The initials of who is awaited, in a grey disc. */
export function HomeAvatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden
      className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--surface-sunken)] text-[length:var(--type-micro)] leading-none font-semibold"
    >
      {initials}
    </span>
  );
}

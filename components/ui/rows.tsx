import { IconChevronRight } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { ViewLink } from "@/components/ui/view-link";

/** Joined rows in a hairline frame (proto « Projet complet », `.rows`). */
export function Rows({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <ul
      aria-label={label}
      className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)] [&>li+li]:border-t [&>li+li]:border-[color:var(--border-hairline)]"
    >
      {children}
    </ul>
  );
}

const sub =
  "text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]";

/** A row that says something (proto `.irow`): its title in semibold, a
 * 13 px source below, a badge on the right. */
export function InfoRow({
  title,
  detail,
  badge,
}: {
  title: string;
  detail?: string;
  badge?: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 px-3.5 py-3 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
      <span className="flex min-w-0 flex-[1_1_18rem] flex-col">
        <b className="font-semibold break-words">{title}</b>
        {detail && <span className={sub}>{detail}</span>}
      </span>
      {badge}
    </li>
  );
}

/** A row that opens a page (proto `.srow`): its title in semibold 16 px,
 * where it is below (14 px), a badge if any, a chevron on the right; the
 * whole row is the link. */
export function LinkRow({
  href,
  title,
  detail,
  badge,
}: {
  href: string;
  title: string;
  detail?: string;
  // What the row asks (« À valider »), at its fixed width.
  badge?: ReactNode;
}) {
  return (
    <li>
      <ViewLink
        href={href}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-primary)] no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--surface-soft)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="font-semibold break-words">{title}</b>
          {detail && (
            <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]">
              {detail}
            </span>
          )}
        </span>
        {badge && <span className="shrink-0">{badge}</span>}
        <IconChevronRight
          aria-hidden
          className="size-3.5 shrink-0 text-[color:var(--text-tertiary)]"
        />
      </ViewLink>
    </li>
  );
}

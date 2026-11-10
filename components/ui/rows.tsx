import { IconChevronRight } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ViewLink } from "@/components/ui/view-link";

/** Joined rows in a hairline frame (proto « Projet complet », `.rows`). */
export function Rows({
  label,
  flush = false,
  children,
}: {
  label?: string;
  // Without its own frame, inside one (a `DimensionItem`).
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "flex flex-col [&>li+li]:border-t [&>li+li]:border-[color:var(--border-hairline)]",
        !flush &&
          "overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card",
      )}
    >
      {children}
    </ul>
  );
}

const sub =
  "text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]";

// The whole row is the link: hover tint, inset focus ring.
const rowLink =
  "text-[color:var(--text-primary)] no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--surface-soft)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]";

function RowChevron() {
  return (
    <IconChevronRight
      aria-hidden
      className="size-3.5 shrink-0 text-[color:var(--text-tertiary)]"
    />
  );
}

/** A row that says something (proto `.irow`): its title in semibold, a
 * 13 px source below, a badge on the right. With `href`, the whole row
 * opens that page (or, with `onClick`, runs it), a chevron after the badge (« Avant les workflows » of
 * the overview, Sacha 09/11/2026). With `leading` (a `StateMark`),
 * laid out as a `ProposalRow` it sits with (the Dispositif's levers under
 * PO's proposals, Sacha 07/11/2026). */
export function InfoRow({
  title,
  detail,
  badge,
  leading,
  href,
  onClick,
}: {
  title: string;
  detail?: string;
  badge?: ReactNode;
  leading?: ReactNode;
  href?: string;
  // Instead of `href`: the whole row is a button (a chevron after the badge).
  onClick?: () => void;
}) {
  if (leading)
    return (
      <li className="flex items-start gap-3 px-4 py-3.5">
        {leading}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body-md font-medium break-words text-[color:var(--text-primary)]">
            {title}
          </span>
          {detail && (
            <span className="text-caption text-[color:var(--text-tertiary)]">
              {detail}
            </span>
          )}
        </span>
        {badge}
      </li>
    );
  const row =
    "flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2.5 px-3.5 py-3 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]";
  const body = (
    <span className="flex min-w-0 flex-[1_1_18rem] flex-col">
      <b className="font-semibold break-words">{title}</b>
      {detail && <span className={sub}>{detail}</span>}
    </span>
  );
  if (href)
    return (
      <li>
        <ViewLink href={href} className={cn(row, "w-full", rowLink)}>
          {body}
          <span className="flex items-center gap-3">
            {badge}
            <RowChevron />
          </span>
        </ViewLink>
      </li>
    );
  if (onClick)
    return (
      <li>
        <button
          type="button"
          onClick={onClick}
          className={cn(row, "w-full cursor-pointer text-left", rowLink)}
        >
          {body}
          <span className="flex items-center gap-3">
            {badge}
            <RowChevron />
          </span>
        </button>
      </li>
    );
  return (
    <li className={row}>
      {body}
      {badge}
    </li>
  );
}

/** A row that opens a page (proto `.srow`): its title in semibold 16 px,
 * where it is below (14 px), a chevron on the right; the whole row is the
 * link. */
export function LinkRow({
  href,
  title,
  detail,
}: {
  href: string;
  title: string;
  detail?: string;
}) {
  return (
    <li>
      <ViewLink
        href={href}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3.5 text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)]",
          rowLink,
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="font-semibold break-words">{title}</b>
          {detail && (
            <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]">
              {detail}
            </span>
          )}
        </span>
        <RowChevron />
      </ViewLink>
    </li>
  );
}

"use client";

import { useRef } from "react";

import { scrollFadeY, useScrollFade } from "@/components/ui/use-scroll-fade";
import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

// The second sidebar of a section (Figma « Double sidebar »: a project,
// Finance): right against the main sidebar, which collapses to icons while
// it is shown (use-collapsed-nav.tsx). Desktop only; small screens get the
// section's own row of tabs or chips.
const frame =
  "sticky top-[var(--shell-inset)] hidden h-[calc(100dvh-2*var(--shell-inset))] w-[var(--project-nav-width)] shrink-0 flex-col overflow-hidden border-r border-[color:var(--border-hairline)] bg-[var(--surface-page)] p-2 text-sidebar-foreground md:flex";

/** The column itself: its head on a hairline (a switcher, a title), then
 * its entries, which scroll under the head on a short screen and fade at
 * the edge with more, as the main sidebar's. */
export function ContextSidebar({
  label,
  head,
  busy = false,
  children,
}: {
  label: string;
  head: React.ReactNode;
  // Its entries still being read (a skeleton).
  busy?: boolean;
  children: React.ReactNode;
}) {
  const entriesRef = useRef<HTMLDivElement>(null);
  useScrollFade(entriesRef, "y");
  return (
    <nav aria-label={label} aria-busy={busy || undefined} className={frame}>
      {/* The head's rule runs the column's whole width, at the height of a
          page's top band (Finance's search, 56 px): the two rules meet on one
          line (Sacha 15/11/2026). It overflows the column's padding. */}
      <div className="-mx-2 -mt-2 mb-1.5 flex min-h-14 shrink-0 items-center border-b border-[color:var(--border-hairline)] px-2">
        <div className="min-w-0 flex-1">{head}</div>
      </div>
      <div
        ref={entriesRef}
        className={cn("-mx-2 flex min-h-0 flex-1 flex-col px-2", scrollFadeY)}
      >
        {children}
      </div>
    </nav>
  );
}

// Proto « Projet complet » (`.pitem`): grey at rest, sunken grey and ink
// when open; 36 px in the new style (docs/STYLE-FINANCE-PARTOUT.md § 4.2),
// 38 in the classic one.
export const contextNavItem =
  "relative flex min-h-9.5 w-full items-center gap-2.5 rounded-lg px-2.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] no-underline modern:min-h-9 modern:gap-2";

/** A group's title in the column, 13 px. */
export function ContextNavGroupTitle({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <p
      id={id}
      className="px-2.5 pt-3 pb-1 text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]"
    >
      {children}
    </p>
  );
}

/** One entry: a link, sunken and ink when its page is open. */
export function ContextNavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <ViewLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        contextNavItem,
        "text-[color:var(--text-secondary)] transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--surface-soft)] hover:text-[color:var(--text-primary)]",
        active &&
          "bg-[var(--surface-sunken)] text-[color:var(--text-primary)] hover:bg-[var(--surface-sunken)]",
      )}
    >
      {children}
    </ViewLink>
  );
}

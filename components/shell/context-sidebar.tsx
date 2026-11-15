"use client";

import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

// The second sidebar of a section (Figma « Double sidebar »: a project,
// Finance): right against the main sidebar, which collapses to icons while
// it is shown (use-collapsed-nav.tsx). Desktop only; small screens get the
// section's own row of tabs or chips.
const frame =
  "sticky top-[var(--shell-inset)] hidden h-[calc(100dvh-2*var(--shell-inset))] w-[var(--project-nav-width)] shrink-0 flex-col overflow-y-auto border-r border-[color:var(--border-hairline)] bg-[var(--surface-page)] p-2 text-sidebar-foreground md:flex";

/** The column itself: its head on a hairline (a switcher, a title), then
 * its entries. */
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
  return (
    <nav aria-label={label} aria-busy={busy || undefined} className={frame}>
      <div className="mb-1.5 border-b border-[color:var(--border-hairline)] pb-1.5">
        {head}
      </div>
      {children}
    </nav>
  );
}

// Proto « Projet complet » (`.pitem`): 38 px, 15 px grey at rest, sunken
// grey and ink when open.
export const contextNavItem =
  "relative flex min-h-9.5 w-full items-center gap-2.5 rounded-lg px-2.5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] no-underline";

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

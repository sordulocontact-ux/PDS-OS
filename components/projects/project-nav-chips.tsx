"use client";

import { IconLock } from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";

import {
  NavDot,
  type ProjectNavState,
} from "@/components/projects/project-nav-list";
import { MineBadge } from "@/components/ui/mine-badge";
import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import type { ProjectSection } from "@/lib/ui/project-sections";
import { cn } from "@/lib/utils";

// Proto « Projet complet » (`.mnav .chipbtn`): 34 px pills on a hairline,
// the open one outlined in ink on soft grey.
const chip =
  "relative inline-flex h-8.5 shrink-0 items-center gap-2 rounded-full border px-3 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] whitespace-nowrap no-underline";

/**
 * The project's navigation on a phone (docs/DESIGN.md § 4, « Navigation du
 * projet »): one scrolling row of chips above the content, each a link to a
 * section with its dot and the viewer's count. Navigation links, never
 * filters: a `nav` with `aria-current`, never on the same row as filters.
 */
export function ProjectNavChips({
  items,
  statuses = {},
  counts = {},
}: { items: ProjectSection[] } & ProjectNavState) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={fr.shell.project.sidebar.label}
      className="-mx-4 flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 md:hidden [&::-webkit-scrollbar]:hidden"
    >
      {items.map((section) => {
        const status = statuses[section.key];
        if (section.restricted)
          return (
            <span
              key={section.key}
              aria-disabled
              title={fr.shell.project.sidebar.restricted}
              className={cn(
                chip,
                "cursor-not-allowed border-[color:var(--border-hairline)] text-[color:var(--text-muted)]",
              )}
            >
              {section.label}
              <IconLock aria-hidden className="size-3.5" />
              <span className="sr-only">
                , {fr.shell.project.sidebar.restricted}
              </span>
            </span>
          );
        const active = section.match(pathname);
        return (
          <ViewLink
            key={section.key}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              chip,
              "border-[color:var(--border-hairline)] bg-card text-[color:var(--text-primary)]",
              active &&
                "border-[color:var(--border-strong)] bg-[var(--surface-soft)]",
            )}
          >
            {status && <NavDot status={status} />}
            {section.label}
            <MineBadge count={counts[section.key] ?? 0} />
          </ViewLink>
        );
      })}
    </nav>
  );
}

"use client";

import { IconSitemap4 } from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { useCollapsedNav } from "@/components/shell/use-collapsed-nav";
import { Button } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { fr } from "@/lib/i18n/fr";
import {
  projectSections,
  type ProjectSection,
  type ProjectSectionGroup,
} from "@/lib/ui/project-sections";
import { cn } from "@/lib/utils";

type Block = { group?: ProjectSectionGroup; items: ProjectSection[] };

// Consecutive sections of the same group form one titled block; the
// overview, ungrouped, stands alone at the top.
function toBlocks(items: ProjectSection[]): Block[] {
  const blocks: Block[] = [];
  for (const item of items) {
    const last = blocks.at(-1);
    if (last && last.group === item.group) last.items.push(item);
    else blocks.push({ group: item.group, items: [item] });
  }
  return blocks;
}

function ProjectSidebarList({
  items,
  onNavigate,
}: {
  items: ProjectSection[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = fr.shell.project.sidebar.groups;
  // The desktop sidebar and the mobile drawer can both be in the page.
  const idPrefix = useId();

  return (
    <div className="flex flex-col gap-6">
      {toBlocks(items).map((block) => (
        <div key={block.group ?? "top"} className="flex flex-col gap-1">
          {block.group && (
            <p
              id={`${idPrefix}-${block.group}`}
              className="px-4 text-caption text-[color:var(--nav-fg-muted)]"
            >
              {groups[block.group]}
            </p>
          )}
          <ul
            className="flex flex-col gap-1"
            aria-labelledby={
              block.group ? `${idPrefix}-${block.group}` : undefined
            }
          >
            {block.items.map((item) => {
              const active = item.match(pathname);
              return (
                <li key={item.key}>
                  <ViewLink
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center rounded-lg px-4 text-body-md text-[color:var(--nav-fg)] no-underline transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--nav-item-hover-bg)]",
                      active &&
                        "bg-[var(--nav-item-active-bg)] font-medium hover:bg-[var(--nav-item-active-bg)]",
                    )}
                  >
                    {item.label}
                  </ViewLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Contextual sidebar of a launched project, desktop only (Figma "Double
// sidebar"), shown when DOUBLE_SIDEBAR is on (lib/ui/project-sections.ts).
// Same sticky geometry as the main Sidebar, so the two read as one card:
// right-only rounding, collapsed or expanded — the two always sit right
// against each other inside a project. See ProjectSidebarMobile below for
// small screens.
export function ProjectSidebar({
  projectId,
  projectTitle,
  canSeeLegal,
}: {
  projectId: string;
  projectTitle: string;
  canSeeLegal: boolean;
}) {
  const items = projectSections(projectId, { legal: canSeeLegal });
  const { doubleSidebar } = useCollapsedNav();
  const t = fr.shell.project.sidebar;

  return (
    <nav
      aria-label={t.label}
      className={cn(
        "sticky top-[var(--shell-inset)] hidden h-[calc(100dvh-2*var(--shell-inset))] w-[var(--project-nav-width)] shrink-0 flex-col gap-4 overflow-y-auto bg-sidebar p-2 text-sidebar-foreground shadow-[var(--nav-shadow)] md:flex",
        doubleSidebar
          ? "rounded-tr-3xl rounded-br-3xl"
          : "rounded-3xl border-l border-[color:var(--nav-divider)]",
      )}
    >
      <p
        className="shrink-0 truncate px-3 text-body-md font-semibold"
        title={projectTitle}
      >
        {projectTitle}
      </p>
      <ProjectSidebarList items={items} />
    </nav>
  );
}

// Small-screen equivalent: a button that opens the same sections in a
// drawer, since the desktop sidebar has no room on a phone (docs/DESIGN.md § 4).
export function ProjectSidebarMobile({
  projectId,
  projectTitle,
  canSeeLegal,
}: {
  projectId: string;
  projectTitle: string;
  canSeeLegal: boolean;
}) {
  const items = projectSections(projectId, { legal: canSeeLegal });
  const t = fr.shell.project.sidebar;
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" className="w-fit md:hidden" />
        }
      >
        <IconSitemap4 aria-hidden />
        {t.label}
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-6 px-6 py-4">
        <SheetHeader className="p-0 pt-1.5">
          <SheetTitle className="truncate" title={projectTitle}>
            {projectTitle}
          </SheetTitle>
        </SheetHeader>
        <ProjectSidebarList items={items} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

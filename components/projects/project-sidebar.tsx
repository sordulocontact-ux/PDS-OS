"use client";

import { IconLock, IconSitemap4 } from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";

import { ProjectSwitcher } from "@/components/projects/project-switcher";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
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
import { workflowStatusTone } from "@/lib/ui/state-tones";
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

// What the sidebar knows of each workflow: its common status, computed on
// the server (lib/workflow-status/load.ts), shown as a dot.
export type SidebarStatuses = Partial<Record<string, string>>;

function ProjectSidebarList({
  items,
  statuses = {},
  onNavigate,
}: {
  items: ProjectSection[];
  statuses?: SidebarStatuses;
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
          {/* A group may go untitled (the tools at the bottom). */}
          {block.group && groups[block.group] && (
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
              block.group && groups[block.group]
                ? `${idPrefix}-${block.group}`
                : undefined
            }
          >
            {block.items.map((item) => {
              // Listed but closed to this viewer: readable, never a link.
              if (item.restricted)
                return (
                  <li key={item.key}>
                    <span
                      aria-disabled
                      title={fr.shell.project.sidebar.restricted}
                      className="flex h-9 cursor-not-allowed items-center justify-between gap-2 rounded-lg px-4 text-body-md text-[color:var(--nav-fg-muted)]"
                    >
                      {item.label}
                      <IconLock aria-hidden className="size-3.5 shrink-0" />
                      <span className="sr-only">
                        , {fr.shell.project.sidebar.restricted}
                      </span>
                    </span>
                  </li>
                );
              const active = item.match(pathname);
              return (
                <li key={item.key}>
                  <ViewLink
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-lg px-4 text-body-md text-[color:var(--nav-fg)] no-underline transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--nav-item-hover-bg)]",
                      active &&
                        "bg-[var(--nav-item-active-bg)] font-medium hover:bg-[var(--nav-item-active-bg)]",
                    )}
                  >
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {statuses[item.key] && (
                      <StatusDot
                        tone={workflowStatusTone[statuses[item.key]!]}
                        label={
                          fr.workflowStatus.statuses[
                            statuses[
                              item.key
                            ] as keyof typeof fr.workflowStatus.statuses
                          ]
                        }
                      />
                    )}
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

// Contextual sidebar of a launched project, desktop only (Figma "PDS OS",
// node 47:12056), shown when DOUBLE_SIDEBAR is on (lib/ui/project-sections.ts).
// Same sticky geometry as the main Sidebar, right against it: full height,
// square, no outer margin, a hairline on the right; at the top, on a
// hairline, the project switcher.
// See ProjectSidebarMobile below for small screens.
export function ProjectSidebar({
  projectId,
  projectTitle,
  canSeeLegal,
  workflows,
  statuses,
}: {
  projectId: string;
  projectTitle: string;
  canSeeLegal: boolean;
  workflows?: readonly string[];
  statuses?: SidebarStatuses;
}) {
  const items = projectSections(projectId, { legal: canSeeLegal, workflows });
  const t = fr.shell.project.sidebar;

  return (
    <nav
      aria-label={t.label}
      className="sticky top-[var(--shell-inset)] hidden h-[calc(100dvh-2*var(--shell-inset))] w-[var(--project-nav-width)] shrink-0 flex-col gap-4 overflow-y-auto border-r border-[color:var(--nav-border)] bg-sidebar pb-2 text-sidebar-foreground md:flex"
    >
      <div className="flex h-14 shrink-0 items-center border-b border-[color:var(--nav-border)] px-2">
        <ProjectSwitcher projectId={projectId} projectTitle={projectTitle} />
      </div>
      <div className="px-2">
        <ProjectSidebarList items={items} statuses={statuses} />
      </div>
    </nav>
  );
}

// Small-screen equivalent: a button that opens the same sections in a
// drawer, since the desktop sidebar has no room on a phone (docs/DESIGN.md § 4).
export function ProjectSidebarMobile({
  projectId,
  projectTitle,
  canSeeLegal,
  workflows,
  statuses,
}: {
  projectId: string;
  projectTitle: string;
  canSeeLegal: boolean;
  workflows?: readonly string[];
  statuses?: SidebarStatuses;
}) {
  const items = projectSections(projectId, { legal: canSeeLegal, workflows });
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
        <ProjectSidebarList
          items={items}
          statuses={statuses}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

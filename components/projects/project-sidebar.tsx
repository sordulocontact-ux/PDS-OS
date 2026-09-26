"use client";

import { IconSitemap4 } from "nucleo-sharp-essential";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useCollapsedNav } from "@/components/shell/use-collapsed-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

type ProjectSidebarItem = {
  key: string;
  label: string;
  href?: string;
  // Active on this page and everything below it (Workflow covers three
  // pages: Cadrage, Stratégie, Sortie).
  match?: (pathname: string) => boolean;
};

// 12 sections in the Figma order ("Devis Sordulo", node 120:74). Only three
// have a page today — Vue d'ensemble, Workflow (Cadrage/Stratégie/Sortie,
// entered through Cadrage) and Calls — the rest is shown, disabled, until
// each gets its own page (docs/DESIGN.md § 4).
function useProjectSidebarItems(projectId: string): ProjectSidebarItem[] {
  const t = fr.shell.project.sidebar;
  return [
    {
      key: "overview",
      label: t.overview,
      href: routes.project(projectId),
      match: (p) => p === routes.project(projectId),
    },
    {
      key: "workflow",
      label: t.workflow,
      href: routes.projectFraming(projectId),
      match: (p) =>
        p.startsWith(routes.projectFraming(projectId)) ||
        p.startsWith(routes.projectStrategy(projectId)) ||
        p.startsWith(routes.projectRelease(projectId)),
    },
    { key: "activations", label: t.activations },
    { key: "work", label: t.work },
    {
      key: "calls",
      label: t.calls,
      href: routes.projectCalls(projectId),
      match: (p) => p.startsWith(routes.projectCalls(projectId)),
    },
    { key: "team", label: t.team },
    { key: "deliverables", label: t.deliverables },
    { key: "files", label: t.files },
    { key: "planning", label: t.planning },
    { key: "budget", label: t.budget },
    { key: "validations", label: t.validations },
    { key: "activity", label: t.activity },
  ];
}

function ProjectSidebarList({
  items,
  onNavigate,
}: {
  items: ProjectSidebarItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const active = item.match?.(pathname) ?? false;
        return (
          <li key={item.key}>
            {item.href ? (
              <Link
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
              </Link>
            ) : (
              <span
                aria-disabled
                title={fr.shell.nav.comingSoon}
                className="flex h-9 cursor-not-allowed items-center rounded-lg px-4 text-body-md text-[color:var(--nav-fg-muted)]"
              >
                {item.label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Contextual sidebar of a launched project, desktop only (Figma "Double
// sidebar"). Same sticky geometry as the main Sidebar, so the two read as one
// card: right-only rounding, collapsed or expanded — the two always sit
// right against each other inside a project. See ProjectSidebarMobile below
// for small screens.
export function ProjectSidebar({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const items = useProjectSidebarItems(projectId);
  const { doubleSidebar } = useCollapsedNav();
  const t = fr.shell.project.sidebar;

  return (
    <nav
      aria-label={t.label}
      className={cn(
        "sticky top-[var(--shell-inset)] hidden h-[calc(100dvh-2*var(--shell-inset))] w-[var(--project-nav-width)] shrink-0 flex-col gap-4 overflow-y-auto bg-sidebar p-4 text-sidebar-foreground shadow-[var(--nav-shadow)] md:flex",
        doubleSidebar
          ? "rounded-tr-3xl rounded-br-3xl"
          : "rounded-3xl border-l border-[color:var(--nav-divider)]",
      )}
    >
      <p
        className="truncate px-3 text-body-md font-semibold"
        title={projectTitle}
      >
        {projectTitle}
      </p>
      <ProjectSidebarList items={items} />
    </nav>
  );
}

// Small-screen equivalent: a button that opens the same 12 sections in a
// drawer, since the desktop sidebar has no room on a phone (docs/DESIGN.md § 4).
export function ProjectSidebarMobile({
  projectId,
  projectTitle,
}: {
  projectId: string;
  projectTitle: string;
}) {
  const items = useProjectSidebarItems(projectId);
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

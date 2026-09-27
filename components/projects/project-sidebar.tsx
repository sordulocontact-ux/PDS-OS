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
  // Active on this page and everything below it (Workflow covers four
  // pages: Cadrage, Stratégie, Conception, Sortie).
  match?: (pathname: string) => boolean;
};

// A section with its own page, active on it and everything below it.
const section = (
  key: string,
  label: string,
  href: string,
): ProjectSidebarItem => ({
  key,
  label,
  href,
  match: (p) => p.startsWith(href),
});

// 12 sections in the Figma order ("Devis Sordulo", node 120:74), each with
// its page; Workflow covers Cadrage/Stratégie/Conception/Sortie, entered through
// Cadrage (docs/DESIGN.md § 4). An item without href is shown disabled.
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
        p.startsWith(routes.projectDesign(projectId)) ||
        p.startsWith(routes.projectRelease(projectId)),
    },
    section("activations", t.activations, routes.projectActivations(projectId)),
    section("work", t.work, routes.projectWork(projectId)),
    section("calls", t.calls, routes.projectCalls(projectId)),
    section("team", t.team, routes.projectTeam(projectId)),
    section(
      "deliverables",
      t.deliverables,
      routes.projectDeliverables(projectId),
    ),
    section("files", t.files, routes.projectFiles(projectId)),
    section("planning", t.planning, routes.projectPlanning(projectId)),
    section("budget", t.budget, routes.projectBudget(projectId)),
    section("validations", t.validations, routes.projectValidations(projectId)),
    section("activity", t.activity, routes.projectActivity(projectId)),
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

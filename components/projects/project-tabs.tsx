"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

// Sections of a project. Links, not ARIA tabs: each section is its own URL.
export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const t = fr.shell.project.tabs;
  const tabs = [
    { href: routes.project(projectId), label: t.overview, exact: true },
    { href: routes.projectFraming(projectId), label: t.framing, exact: false },
    { href: routes.projectCalls(projectId), label: t.calls, exact: false },
    { href: routes.projectRelease(projectId), label: t.release, exact: false },
  ];

  return (
    <nav
      aria-label={fr.shell.project.tabsLabel}
      className="-mx-4 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
    >
      <ul className="flex gap-1">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

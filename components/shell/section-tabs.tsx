"use client";

import { usePathname } from "next/navigation";

import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

export type SectionTab = {
  href: string;
  label: string;
  // Active only on its own URL (an overview), not on the pages below it.
  exact?: boolean;
};

// Sections of a detail page (project, artist). Links, not ARIA tabs: each
// section is its own URL, shareable and reachable with Back.
export function SectionTabs({
  tabs,
  label,
}: {
  tabs: SectionTab[];
  label: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className="-mx-4 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
    >
      <ul className="flex gap-1">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="shrink-0">
              <ViewLink
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
              </ViewLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

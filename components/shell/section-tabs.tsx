"use client";

import { usePathname } from "next/navigation";

import { TabBar } from "@/components/ui/tab-bar";

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
    <TabBar
      label={label}
      items={tabs.map((tab) => ({
        href: tab.href,
        label: tab.label,
        current: tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`),
      }))}
    />
  );
}

"use client";

import { usePathname } from "next/navigation";

import { TabBar } from "@/components/ui/tab-bar";
import { fr } from "@/lib/i18n/fr";
import { projectSections } from "@/lib/ui/project-sections";

// Sections of a launched project as one row of tabs under its header, when
// DOUBLE_SIDEBAR is off (lib/ui/project-sections.ts) — the same bar as an
// artist's or a title's page. A section without a tab of its own lights its
// parent tab. Under the tabs comes the Workflow's stepper or nothing: filters
// belong to the page (docs/DESIGN.md § 4).
export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const sections = projectSections(projectId);
  const open = sections.find((section) => section.match(pathname));
  const currentTab = open?.tabParent ?? open?.key;

  return (
    <TabBar
      label={fr.shell.project.sidebar.label}
      items={sections
        .filter((section) => !section.tabParent)
        .map((section) => ({
          href: section.href,
          label: section.label,
          current: section.key === currentTab,
        }))}
    />
  );
}

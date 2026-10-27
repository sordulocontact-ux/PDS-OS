"use client";

import { usePathname } from "next/navigation";

import { TabBar } from "@/components/ui/tab-bar";
import { shell } from "@/lib/i18n/fr/shell";
import { projectSections } from "@/lib/ui/project-sections";

const fr = { shell };

// Sections of a launched project as one row of tabs under its header, when
// DOUBLE_SIDEBAR is off (lib/ui/project-sections.ts) — the same bar as an
// artist's or a title's page. A section without a tab of its own lights its
// parent tab; a restricted section has no tab. Under the tabs come the open
// workflow's chevrons or nothing: filters belong to the page (docs/DESIGN.md § 4).
export function ProjectTabs({
  projectId,
  canSeeLegal,
  canSeeBudget = true,
  workflows,
}: {
  projectId: string;
  canSeeLegal: boolean;
  canSeeBudget?: boolean;
  workflows?: readonly string[];
}) {
  const pathname = usePathname();
  const sections = projectSections(projectId, {
    legal: canSeeLegal,
    budget: canSeeBudget,
    workflows,
  });
  const open = sections.find((section) => section.match(pathname));
  const currentTab = open?.tabParent ?? open?.key;

  return (
    <TabBar
      label={fr.shell.project.sidebar.label}
      items={sections
        .filter(
          (section) =>
            !section.tabParent && !section.restricted && !section.hidden,
        )
        .map((section) => ({
          href: section.href,
          label: section.label,
          current: section.key === currentTab,
        }))}
    />
  );
}

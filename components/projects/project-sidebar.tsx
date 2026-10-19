"use client";

import { ProjectNavChips } from "@/components/projects/project-nav-chips";
import {
  ProjectNavList,
  type ProjectNavState,
} from "@/components/projects/project-nav-list";
import { ProjectSwitcher } from "@/components/projects/project-switcher";
import { fr } from "@/lib/i18n/fr";
import { projectSections } from "@/lib/ui/project-sections";

export type ProjectNavProps = ProjectNavState & {
  projectId: string;
  projectTitle: string;
  canSeeLegal: boolean;
  canSeeBudget?: boolean;
  workflows?: readonly string[];
};

// The entries of the navigation: the hidden sections (Équipe, Planning,
// Calls, Livrables, Fichiers) keep their routes, not an entry (decision C0).
const navItems = ({
  projectId,
  canSeeLegal,
  canSeeBudget = true,
  workflows,
}: ProjectNavProps) =>
  projectSections(projectId, {
    legal: canSeeLegal,
    budget: canSeeBudget,
    workflows,
  }).filter((section) => !section.hidden);

// Contextual sidebar of a launched project, desktop only (proto « Projet
// complet », `.projnav`; docs/DESIGN.md § 4, « Navigation du projet »): the
// project switcher on a hairline, Vue d'ensemble and Cadrage, Workflows,
// Pilotage. Same sticky geometry as the main Sidebar, right against it.
export function ProjectSidebar(props: ProjectNavProps) {
  return (
    <nav
      aria-label={fr.shell.project.sidebar.label}
      className="sticky top-[var(--shell-inset)] hidden h-[calc(100dvh-2*var(--shell-inset))] w-[var(--project-nav-width)] shrink-0 flex-col overflow-y-auto border-r border-[color:var(--border-hairline)] bg-[var(--surface-page)] p-2 text-sidebar-foreground md:flex"
    >
      <div className="mb-1.5 border-b border-[color:var(--border-hairline)] pb-1.5">
        <ProjectSwitcher
          projectId={props.projectId}
          projectTitle={props.projectTitle}
        />
      </div>
      <ProjectNavList
        items={navItems(props)}
        statuses={props.statuses}
        counts={props.counts}
      />
    </nav>
  );
}

// Small screens: the same entries as a row of chips above the content.
export function ProjectSidebarMobile(props: ProjectNavProps) {
  return (
    <ProjectNavChips
      items={navItems(props)}
      statuses={props.statuses}
      counts={props.counts}
    />
  );
}

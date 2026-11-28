"use client";

import { ProjectNavChips } from "@/components/projects/project-nav-chips";
import { ContextSidebar } from "@/components/shell/context-sidebar";
import {
  ProjectNavList,
  type ProjectNavState,
} from "@/components/projects/project-nav-list";
import { ProjectSwitcher } from "@/components/projects/project-switcher";
import { useCarriedTitle } from "@/components/projects/use-carried-title";
import { Skeleton } from "@/components/ui/skeleton";
import { shell } from "@/lib/i18n/fr/shell";
import { carryHref, type CarriedTitle } from "@/lib/projects/title-carry-rules";
import { projectSections } from "@/lib/ui/project-sections";

const fr = { shell };

export type ProjectNavProps = ProjectNavState & {
  projectId: string;
  projectTitle: string;
  canSeeLegal: boolean;
  canSeeBudget?: boolean;
  workflows?: readonly string[];
  // A collective: « Titres et artistes » after the overview (lot 6).
  collective?: boolean;
  // Where each entry opens, from the journeys (lib/journey/landing.ts):
  // straight to its step, not through the module's redirecting page.
  entries?: Record<string, string>;
};

// The entries of the navigation: the hidden sections (Équipe, Planning,
// Livrables, Fichiers) keep their routes, not an entry (decision C0). Inside
// a collective's title, the other workflows worked by title open on it
// (`carried`, lib/projects/title-carry-rules.ts).
const navItems = (
  {
    projectId,
    canSeeLegal,
    canSeeBudget = true,
    workflows,
    collective = false,
    entries = {},
  }: ProjectNavProps,
  carried: CarriedTitle | null,
) =>
  projectSections(projectId, {
    legal: canSeeLegal,
    budget: canSeeBudget,
    workflows,
    collective,
  })
    .filter((section) => !section.hidden)
    .map((section) => ({
      ...section,
      href: carryHref(
        section.key,
        entries[section.key] ?? section.href,
        carried,
      ),
    }));

// Contextual sidebar of a launched project, desktop only (proto « Projet
// complet », `.projnav`; docs/DESIGN.md § 4, « Navigation du projet »): the
// project switcher on a hairline, Vue d'ensemble and Cadrage, Workflows,
// Pilotage. Same sticky geometry as the main Sidebar, right against it.
export function ProjectSidebar(props: ProjectNavProps) {
  const carried = useCarriedTitle(props.projectId, Boolean(props.collective));
  return (
    <ContextSidebar
      label={fr.shell.project.sidebar.label}
      head={
        <ProjectSwitcher
          projectId={props.projectId}
          projectTitle={props.projectTitle}
        />
      }
    >
      <ProjectNavList
        items={navItems(props, carried)}
        statuses={props.statuses}
        counts={props.counts}
        reasons={props.reasons}
      />
    </ContextSidebar>
  );
}

// The sidebar on a first visit, before the workflows it lists are read
// (components/projects/project-frame.tsx): the switcher and rows standing
// for the entries.
export function ProjectSidebarSkeleton({
  projectId,
  projectTitle,
}: Pick<ProjectNavProps, "projectId" | "projectTitle">) {
  return (
    <ContextSidebar
      label={fr.shell.project.sidebar.label}
      busy
      head={
        <ProjectSwitcher projectId={projectId} projectTitle={projectTitle} />
      }
    >
      <div className="flex flex-col gap-1.5 p-1">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    </ContextSidebar>
  );
}

// Its row of chips on a phone, the same way.
export function ProjectSidebarMobileSkeleton() {
  return (
    <div
      aria-hidden
      className="-mx-4 flex gap-1.5 overflow-hidden px-4 md:hidden"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-8.5 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  );
}

// Small screens: the same entries as a row of chips above the content.
export function ProjectSidebarMobile(props: ProjectNavProps) {
  const carried = useCarriedTitle(props.projectId, Boolean(props.collective));
  return (
    <ProjectNavChips
      items={navItems(props, carried)}
      statuses={props.statuses}
      counts={props.counts}
      reasons={props.reasons}
    />
  );
}

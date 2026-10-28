"use client";

import { usePathname } from "next/navigation";

import { AddExpenseButton } from "@/components/budget/add-expense-button";
import { ReadOnlyNotice } from "@/components/projects/read-only-notice";
import {
  useSubModuleCounts,
  useModuleEntries,
} from "@/components/shell/module/sub-module-counts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ModuleHeader,
  type ModuleHeaderProps,
} from "@/components/shell/module/module-header";
import type { ProjectHeaderData } from "@/lib/projects/header";
import type { ModuleCrumb } from "@/lib/ui/module-frame";
import {
  isSubModuleAt,
  moduleTrail,
  projectSections,
} from "@/lib/ui/project-sections";
import { cn } from "@/lib/utils";

export type ProjectHeaderOverrides = Partial<
  Pick<ModuleHeaderProps, "title" | "status" | "actions" | "facts">
> & {
  // Replaces the whole trail.
  crumbs?: ModuleCrumb[];
  // Added after the URL's trail (a deliverable of the Production).
  extraCrumbs?: ModuleCrumb[];
  // The module's steps: the one whose page is open ends the trail.
  steps?: Array<{ href: string; title: string }>;
};

// Before a page's first header is read (components/projects/project-
// header.tsx): the trail, the title and the facts as rows. Like the header,
// the default one steps aside when the page has its own.
export function ProjectHeaderSkeleton({
  isDefault = false,
}: {
  isDefault?: boolean;
}) {
  return (
    <div
      aria-hidden
      data-project-header={isDefault ? "default" : "page"}
      className={cn(
        "flex flex-col gap-5",
        isDefault && "group-has-[[data-project-header=page]]/project:hidden",
      )}
    >
      <Skeleton className="h-5 w-56 max-w-full" />
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-5 w-96 max-w-full" />
    </div>
  );
}

/**
 * The head of a launched project's page, read from the URL (trail, h1, the
 * Marketing's pills) and completed by what the module gives (its step, its
 * facts, its actions), then the read-only notice. `isDefault`: the one the
 * project layout renders for every page; it steps aside when a page renders
 * its own (docs/ARCHITECTURE.md § 3 ter).
 */
export function ProjectHeaderView({
  data,
  isDefault = false,
  crumbs,
  extraCrumbs = [],
  steps,
  title,
  facts,
  actions,
  ...rest
}: ProjectHeaderOverrides & { data: ProjectHeaderData; isDefault?: boolean }) {
  const pathname = usePathname();
  // The viewer's actions per pill, reported by the project's navigation.
  const mine = useSubModuleCounts(data.projectId);
  // Where each module and pill opens (lib/journey/landing.ts).
  const opens = useModuleEntries(data.projectId);
  const sections = projectSections(data.projectId, data.sections);
  const trail = moduleTrail(data.projectId, pathname, sections, {
    projectTitle: data.projectTitle,
    subModules: data.subModules,
  });
  // A crumb naming a module or a pill opens where its entry does.
  const entryOf = new Map(
    [...sections, ...data.subModules].flatMap((s) =>
      opens[s.key] ? [[s.href, opens[s.key]] as const] : [],
    ),
  );
  const step = (steps ?? data.steps).find((s) => s.href === pathname);
  const all = crumbs ?? [
    ...trail.crumbs.map((c) =>
      c.href && entryOf.has(c.href) ? { ...c, href: entryOf.get(c.href) } : c,
    ),
    ...extraCrumbs,
    ...(step ? [{ label: step.title }] : []),
  ];
  const inMarketing = data.subModules.some((s) => isSubModuleAt(s, pathname));
  return (
    <div
      data-project-header={isDefault ? "default" : "page"}
      className={cn(
        "flex flex-col gap-5",
        isDefault && "group-has-[[data-project-header=page]]/project:hidden",
      )}
    >
      <ModuleHeader
        crumbs={all}
        title={title ?? trail.title}
        tabs={
          inMarketing
            ? data.subModules.map((s) => ({
                key: s.key,
                label: s.label,
                href: s.built ? (opens[s.key] ?? s.href) : undefined,
                title: s.title,
                done: s.done,
                current: isSubModuleAt(s, pathname),
                mine: mine[s.key],
              }))
            : undefined
        }
        facts={facts ?? data.facts}
        actions={
          actions || data.canAddExpense ? (
            <>
              {actions}
              {/* Hides itself outside the Marketing (MKT-S1-15). */}
              {data.canAddExpense && (
                <AddExpenseButton projectId={data.projectId} />
              )}
            </>
          ) : undefined
        }
        {...rest}
      />
      <ReadOnlyNotice projectId={data.projectId} />
    </div>
  );
}

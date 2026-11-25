"use client";

import { usePathname } from "next/navigation";

import { AddExpenseButton } from "@/components/budget/add-expense-button";
import { ReadOnlyNotice } from "@/components/projects/read-only-notice";
import { BackLink } from "@/components/shell/back-link";
import { StepDue, type StepHead } from "@/components/shell/journey/step-due";
import {
  useSubModuleCounts,
  useModuleEntries,
} from "@/components/shell/module/sub-module-counts";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ModuleHeader,
  type ModuleHeaderProps,
} from "@/components/shell/module/module-header";
import { moduleFrame } from "@/lib/i18n/fr/module-frame";
import type { ProjectHeaderData } from "@/lib/projects/header";
import type { CrumbOption, ModuleCrumb } from "@/lib/ui/module-frame";
import {
  isSubModuleAt,
  moduleTrail,
  projectSections,
} from "@/lib/ui/project-sections";
import { cn } from "@/lib/utils";

const fr = { moduleFrame };

export type ProjectHeaderOverrides = Partial<
  Pick<
    ModuleHeaderProps,
    "title" | "subtitle" | "media" | "status" | "actions" | "facts"
  >
> & {
  // Replaces the whole trail.
  crumbs?: ModuleCrumb[];
  // Added after the URL's trail (a deliverable of the Production).
  extraCrumbs?: ModuleCrumb[];
  // The module's steps: the one whose page is open ends the trail.
  steps?: Array<StepHead & { href: string }>;
  // The open step names the page: h1 = its title, its due date on the right,
  // its why under it (docs/VISION-UX.md § 4, Sacha 10/11/2026). "path": the
  // step whose URL is the current path (a layout, which does not know it).
  head?: StepHead | "path";
  // A page reached from a step without being one of its own (the Plan de
  // sortie): the arrow before its title goes back to the step.
  back?: { href: string; label: string };
};

// Before a page's first header is read (components/projects/project-
// header.tsx): the trail and the title as rows. Like the header,
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
      {/* The trail, in the page's top bar like ModuleHeader's. */}
      <div className="absolute inset-x-0 top-0 flex h-[var(--project-bar-height)] items-center px-6">
        <Skeleton className="h-5 w-56 max-w-full" />
      </div>
      <Skeleton className="h-8.5 w-64 max-w-full" />
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
  head,
  back,
  title,
  media,
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
    subModules: data.subModules,
  });
  // A crumb naming a module or a pill opens where its entry does.
  const entryOf = new Map(
    [...sections, ...data.subModules].flatMap((s) =>
      opens[s.key] ? [[s.href, opens[s.key]] as const] : [],
    ),
  );
  // By its path: a collective's step keeps its title or release in its
  // address (`?titre=`, `?sortie=`), and the trail still ends on it
  // (« Master / Néons / Source »).
  const step = (steps ?? data.steps).find(
    (s) => s.href.split(/[?#]/)[0] === pathname,
  );
  const shown: StepHead | undefined = head === "path" ? step : head;
  const sub = data.subModules.find((s) => isSubModuleAt(s, pathname));
  // The Marketing's sub-modules, to switch to from the trail (Sacha
  // 10/11/2026): where each pill opens, its check and its count.
  const subOptions: CrumbOption[] = data.subModules
    .filter((s) => s.built)
    .map((s) => ({
      key: s.key,
      label: s.label,
      href: opens[s.key] ?? s.href,
      current: s.key === sub?.key,
      done: s.done,
      mine: mine[s.key],
    }));
  const all = crumbs ?? [
    ...trail.crumbs.map((c) => {
      if (sub && c.href === sub.href)
        return {
          ...c,
          // Below its own page (an activation, a deliverable), the
          // sub-module's crumb goes up to it, not to where it opens.
          href:
            pathname !== sub.href ? sub.href : (entryOf.get(c.href) ?? c.href),
          options: subOptions,
        };
      return c.href && entryOf.has(c.href)
        ? { ...c, href: entryOf.get(c.href) }
        : c;
    }),
    ...extraCrumbs,
    ...(step ? [{ label: step.title }] : []),
  ];
  const inMarketing = Boolean(sub);
  // An object's page below a sub-module (an activation, a deliverable):
  // its name is the title, an arrow before it goes up to the list (Sacha
  // 10/11/2026), like its crumb.
  const object =
    sub && pathname !== sub.href ? extraCrumbs.at(0)?.label : undefined;
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
        title={title ?? shown?.title ?? object ?? trail.title}
        meta={shown && <StepDue step={shown} />}
        why={shown?.why || undefined}
        media={
          media ??
          (back ? (
            <BackLink href={back.href} icon>
              {back.label}
            </BackLink>
          ) : sub && object ? (
            <BackLink href={sub.href} icon>
              {fr.moduleFrame.backTo(sub.label)}
            </BackLink>
          ) : undefined)
        }
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
        // Only a module's own facts: the project's line is gone from the
        // head (Figma PDS OS 304:20801, Sacha 29/10/2026).
        facts={facts}
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

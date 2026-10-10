"use client";

import { IconChevronRight } from "nucleo-sharp-essential";
import { usePathname } from "next/navigation";

import { IconArrowLeft } from "@/components/icons";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  LEGAL_BRANCH_PAGES,
  builtLegalStepOf,
  legalChevronHref,
  legalCurrentStep,
  type LegalBranchPage,
  type LegalStepKey,
} from "@/lib/ui/legal-steps";
import { projectSections } from "@/lib/ui/project-sections";
import { cn } from "@/lib/utils";

// A workflow's step as its chevrons know it (computed by the layout).
export type CrumbStep = { label: string; href: string; also?: string[] };

// `up`: a level the back arrow may return to (not the artist, a side path).
type Crumb = { label: string; href?: string; up?: boolean };

function stepCrumbs(
  pathname: string,
  projectId: string,
  section: string,
  steps: Partial<Record<string, CrumbStep[]>>,
  legalDone: readonly LegalStepKey[],
): Crumb[] {
  if (section === "legal") {
    const base = routes.projectLegal(projectId);
    const page = builtLegalStepOf(
      pathname.slice(base.length).split("/").filter(Boolean),
    );
    if (!page) return [];
    const step = legalCurrentStep(page, legalDone);
    const crumbs: Crumb[] = [
      {
        label: fr.shell.project.legalSteps[step],
        href: legalChevronHref(projectId, step).split("#")[0],
        up: true,
      },
    ];
    // A branch opened by an action of the plan: named after the plan.
    if (LEGAL_BRANCH_PAGES.includes(page as LegalBranchPage))
      crumbs.push({
        label: fr.shell.project.legalSteps.branches[page as LegalBranchPage],
      });
    return crumbs;
  }
  if (section === "framing")
    return pathname.startsWith(routes.projectFramingBrief(projectId))
      ? [{ label: fr.shell.project.breadcrumb.brief }]
      : [];
  const step = steps[section]?.find(
    (step) =>
      step.href !== "" &&
      (pathname === step.href || !!step.also?.includes(pathname)),
  );
  return step ? [{ label: step.label, href: step.href, up: true }] : [];
}

/**
 * Where one stands — Projets › Artiste › Projet › Workflow › Étape — at the
 * top of every project page (ticket « Architecture globale » § 6, maquettes
 * 01 to 03). A landmark, not a third menu: the sidebar and the chevrons
 * stay the ways to move. Each level but the open page leads back, and the
 * arrow returns one level up. The steps come from the same data as the
 * chevrons; a section the viewer may not open is never named.
 */
export function ProjectBreadcrumb({
  projectId,
  projectTitle,
  artist,
  launched,
  canSeeLegal,
  workflows,
  steps,
  legalDone,
}: {
  projectId: string;
  projectTitle: string;
  artist: { name: string; href: string | null } | null;
  launched: boolean;
  canSeeLegal: boolean;
  workflows?: readonly string[];
  steps: Partial<Record<string, CrumbStep[]>>;
  legalDone: readonly LegalStepKey[];
}) {
  const pathname = usePathname();
  const section = launched
    ? projectSections(projectId, { legal: canSeeLegal, workflows }).find(
        (item) => !item.restricted && item.match(pathname),
      )
    : undefined;

  const crumbs: Crumb[] = [
    { label: fr.shell.nav.projects, href: routes.projects, up: true },
    ...(artist ? [{ label: artist.name, href: artist.href ?? undefined }] : []),
    { label: projectTitle, href: routes.project(projectId), up: true },
    ...(section
      ? [
          { label: section.label, href: section.href, up: true },
          ...stepCrumbs(pathname, projectId, section.key, steps, legalDone),
        ]
      : []),
  ];
  // One level up: the nearest level before the open page that is another
  // page (the overview's project level is the overview itself).
  const back = crumbs
    .slice(0, -1)
    .reverse()
    .find((crumb) => crumb.up && crumb.href && crumb.href !== pathname);

  return (
    <nav
      aria-label={fr.shell.project.breadcrumb.label}
      className="flex min-w-0 items-center gap-3"
    >
      {back?.href && (
        <ViewLink
          href={back.href}
          aria-label={fr.shell.project.breadcrumb.back(back.label)}
          className="-m-1 flex shrink-0 rounded-md p-1 text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:text-foreground"
        >
          <IconArrowLeft aria-hidden className="size-4" />
        </ViewLink>
      )}
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-body-md text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          const here = !crumb.href || crumb.href === pathname;
          return (
            <li key={index} className="flex min-w-0 items-center gap-1.5">
              {index > 0 && (
                <IconChevronRight aria-hidden className="size-3 shrink-0" />
              )}
              {here ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={cn("truncate", last && "text-foreground")}
                >
                  {crumb.label}
                </span>
              ) : (
                <ViewLink
                  href={crumb.href!}
                  className={cn(
                    "truncate no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:text-foreground",
                    last && "text-foreground",
                  )}
                >
                  {crumb.label}
                </ViewLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

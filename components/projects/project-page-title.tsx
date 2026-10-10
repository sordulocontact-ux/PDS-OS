"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import { projectSections, projectTrail } from "@/lib/ui/project-sections";

/**
 * Head of every page of a launched project (Figma « PDS OS », node
 * 76:3145): the section's name as the h1 — « Master », « Budget » — and,
 * on a page opened from inside a section, the trail to it
 * (« Master / Brief Mix/Master »). Read from the URL, so the layout renders
 * it once for every page.
 */
export function ProjectPageTitle({
  projectId,
  canSeeLegal,
  workflows,
}: {
  projectId: string;
  canSeeLegal: boolean;
  workflows?: readonly string[];
}) {
  const pathname = usePathname();
  const trail = projectTrail(
    projectId,
    pathname,
    projectSections(projectId, { legal: canSeeLegal, workflows }),
  );
  const current = trail.at(-1);
  if (!current) return null;
  const parents = trail.slice(0, -1);

  return (
    <header className="flex min-w-0 flex-wrap items-center gap-x-2 text-display-md font-medium tracking-[var(--type-display-tracking)]">
      {parents.length > 0 && (
        <nav
          aria-label={fr.shell.project.trail}
          className="flex items-center gap-x-2"
        >
          {parents.map((crumb) => (
            <Fragment key={crumb.label}>
              {crumb.href ? (
                <ViewLink
                  href={crumb.href}
                  className="text-[color:var(--text-tertiary)] no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:text-foreground"
                >
                  {crumb.label}
                </ViewLink>
              ) : (
                <span className="text-[color:var(--text-tertiary)]">
                  {crumb.label}
                </span>
              )}
              <span aria-hidden className="text-[color:var(--text-muted)]">
                /
              </span>
            </Fragment>
          ))}
        </nav>
      )}
      <h1 className="min-w-0 break-words">{current.label}</h1>
    </header>
  );
}

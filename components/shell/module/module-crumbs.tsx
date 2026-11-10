import { Fragment } from "react";

import { ViewLink } from "@/components/ui/view-link";
import { moduleFrame } from "@/lib/i18n/fr/module-frame";

import { CrumbSwitcher } from "./crumb-switcher";
import type { ModuleCrumb } from "@/lib/ui/module-frame";
import { cn } from "@/lib/utils";

const fr = { moduleFrame };

export type { ModuleCrumb };

/**
 * The trail of a project's page (Figma PDS OS, node 304:20801, Sacha
 * 29/10/2026): « Module / [sous-module /] Étape » in the bar at the top of
 * the page (ProjectFrame draws the bar, `--project-bar-height`), every
 * segment a link but the last, which is the page itself. No project crumb:
 * the project's sidebar names it. A segment with siblings (`options`) gets
 * a double chevron to switch to one of them (CrumbSwitcher).
 */
export function ModuleCrumbs({
  crumbs,
  className,
}: {
  crumbs: ModuleCrumb[];
  className?: string;
}) {
  if (crumbs.length === 0) return null;
  const last = crumbs.length - 1;
  return (
    <nav aria-label={fr.moduleFrame.crumbs} className={className}>
      <ol className="flex min-w-0 items-center gap-2 text-body-md font-medium text-[color:var(--text-tertiary)]">
        {crumbs.map((crumb, index) => (
          <Fragment key={`${index}-${crumb.label}`}>
            <li className={cn("min-w-0 truncate", index < last && "shrink-0")}>
              {crumb.options && crumb.options.length > 1 ? (
                <CrumbSwitcher
                  crumb={{ ...crumb, options: crumb.options }}
                  last={index === last}
                />
              ) : index === last ? (
                <span
                  aria-current="page"
                  className="text-[color:var(--text-primary)]"
                >
                  {crumb.label}
                </span>
              ) : crumb.href ? (
                <ViewLink
                  href={crumb.href}
                  className="text-[color:var(--text-tertiary)] no-underline transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:text-foreground focus-visible:rounded-sm"
                >
                  {crumb.label}
                </ViewLink>
              ) : (
                crumb.label
              )}
            </li>
            {index < last && (
              <li aria-hidden className="text-[color:var(--text-muted)]">
                /
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

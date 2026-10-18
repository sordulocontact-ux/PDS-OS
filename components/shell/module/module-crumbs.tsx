import { Fragment } from "react";

import { ViewLink } from "@/components/ui/view-link";
import { fr } from "@/lib/i18n/fr";
import type { ModuleCrumb } from "@/lib/ui/module-frame";

export type { ModuleCrumb };

/**
 * The trail above a module (proto « Projet complet », docs/DESIGN.md § 4,
 * « En-tête de module »): « Projet › Module › [sous-module ›] Étape », 14 px
 * grey, every segment a link but the last, which is the page itself.
 */
export function ModuleCrumbs({ crumbs }: { crumbs: ModuleCrumb[] }) {
  if (crumbs.length === 0) return null;
  const last = crumbs.length - 1;
  return (
    <nav aria-label={fr.moduleFrame.crumbs}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]">
        {crumbs.map((crumb, index) => (
          <Fragment key={`${index}-${crumb.label}`}>
            <li className="min-w-0 break-words">
              {index === last ? (
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
                ›
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

"use client";

import { usePathname } from "next/navigation";

import { FilterChipLink } from "@/components/ui/filter-chip";
import { ProcessSteps } from "@/components/ui/process-steps";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  LEGAL_BRANCH_PAGES,
  LEGAL_BUILT_STEPS,
  LEGAL_STEP_KEYS,
  legalStepHref,
  legalStepLabel,
  type LegalStepKey,
} from "@/lib/ui/legal-steps";

// The Juridique steps as chevrons, without numbers (Figma), at the top of the
// Juridique section — same place and component as the Workflow's. Hides
// itself elsewhere, so the layout renders it around every project page.
// `done`: the steps really done, computed by the server (lib/legal/steps-done.ts).
export function LegalSteps({
  projectId,
  done,
}: {
  projectId: string;
  done: readonly LegalStepKey[];
}) {
  const pathname = usePathname();
  const t = fr.shell.project.legalSteps;
  const base = routes.projectLegal(projectId);
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return null;

  return (
    <div className="flex flex-col gap-3">
      <ProcessSteps
        label={fr.shell.project.legalSteps.label}
        numbered={false}
        steps={LEGAL_STEP_KEYS.map((key) => {
          const href = legalStepHref(projectId, key);
          const built = LEGAL_BUILT_STEPS.includes(key);
          return {
            key,
            label: legalStepLabel(key),
            href: built ? href : undefined,
            title: built ? undefined : fr.shell.project.legalSteps.soon,
            current: pathname === href,
            done: done.includes(key),
          };
        })}
      />
      {/* The branches are no steps: dossiers opened at any time (Sacha,
        05/10/2026: « des pages qu'on ne peut atteindre que depuis le
        Suivi »). */}
      <nav aria-label={t.branchesLabel} className="flex flex-wrap gap-2">
        {LEGAL_BRANCH_PAGES.map((page) => {
          const href = routes.projectLegalStep(projectId, page);
          return (
            <FilterChipLink key={page} href={href} current={pathname === href}>
              {t.branches[page]}
            </FilterChipLink>
          );
        })}
      </nav>
    </div>
  );
}

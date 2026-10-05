"use client";

import { usePathname } from "next/navigation";

import { ProcessSteps } from "@/components/ui/process-steps";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  LEGAL_BUILT_STEPS,
  LEGAL_STEP_KEYS,
  legalStepHref,
  legalStepLabel,
} from "@/lib/ui/legal-steps";

// The Juridique steps as chevrons, without numbers (Figma), at the top of the
// Juridique section — same place and component as the Workflow's. Hides
// itself elsewhere, so the layout renders it around every project page.
export function LegalSteps({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = routes.projectLegal(projectId);
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return null;

  return (
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
        };
      })}
    />
  );
}

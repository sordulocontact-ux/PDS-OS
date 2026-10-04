"use client";

import { usePathname } from "next/navigation";

import { ProcessSteps } from "@/components/ui/process-steps";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { WORKFLOW_STEPS } from "@/lib/ui/workflow-steps";

// The 7 steps of the business process as chevrons (ProcessSteps), at the top
// of the "Workflow" section (Cadrage, Stratégie, Conception, Sortie) — see
// lib/ui/workflow-steps.ts. Hides itself outside those pages, so the layout
// can render it unconditionally around every project page.
// The fill marks the page open; the check comes from the project's stages
// (`validatedStages`), never from the step's position.
// `lockedSteps`: steps that have a page but may not be opened yet (the
// Stratégie before the Cadrage is validated) — shown greyed, not linked.
export function WorkflowBreadcrumb({
  projectId,
  validatedStages,
  lockedSteps = [],
}: {
  projectId: string;
  validatedStages: readonly string[];
  lockedSteps?: readonly string[];
}) {
  const pathname = usePathname();
  const t = fr.shell.project.workflowSteps;
  const inWorkflow = [
    routes.projectFraming(projectId),
    routes.projectStrategy(projectId),
    routes.projectDesign(projectId),
    routes.projectRelease(projectId),
  ].some((href) => pathname.startsWith(href));
  if (!inWorkflow) return null;

  return (
    <ProcessSteps
      label={t.label}
      steps={WORKFLOW_STEPS.map((step) => {
        const locked = lockedSteps.includes(step.key);
        const href = step.href?.(projectId);
        return {
          key: step.key,
          label: step.label,
          href: locked ? undefined : href,
          title: locked ? t.locked[step.key] : fr.shell.nav.comingSoon,
          // A sub-page (the Cadrage's shareable Brief) keeps its step open.
          current: href
            ? pathname === href || pathname.startsWith(`${href}/`)
            : false,
          done: validatedStages.includes(step.stageKey),
        };
      })}
    />
  );
}

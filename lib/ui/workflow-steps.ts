import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The 7 steps of the business process (docs/CONTEXTE-PROJET.md § 4), shown as
// a fixed breadcrumb at the top of the "Workflow" section (Figma "Devis
// Sordulo", node 120:74). This is navigation dressing, not project state:
// whether the process has 7 or 5 steps is still an open question with the
// client (docs/CONTEXTE-PROJET.md § 10, point 3). The real, per-project state
// stays in ProjectStage (Vue d'ensemble page) — only 4 of these 7 steps have
// a page today.
export type WorkflowStep = {
  key: string;
  label: string;
  // Absent when the step has no page yet: shown, but not a link.
  href?: (projectId: string) => string;
};

const t = fr.shell.project.workflowSteps;

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  { key: "framing", label: t.framing, href: routes.projectFraming },
  { key: "strategy", label: t.strategy, href: routes.projectStrategy },
  { key: "conception", label: t.conception, href: routes.projectDesign },
  { key: "production", label: t.production },
  { key: "delivery", label: t.delivery, href: routes.projectRelease },
  { key: "defense", label: t.defense },
  { key: "wrap", label: t.wrap },
];

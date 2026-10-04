import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The 7 steps of the business process (docs/CONTEXTE-PROJET.md § 4), shown as
// chevrons at the top of the "Workflow" section (ProcessSteps, Figma "PDS OS",
// node 1510:3096). Whether the process has 7 or 5 steps is still an open
// question with the client (docs/CONTEXTE-PROJET.md § 10, point 3). The state
// is never decided here: a step is checked when its ProjectStage is validated
// (`stageKey`) — only 4 of these 7 steps have a page today.
export type WorkflowStep = {
  key: string;
  label: string;
  // Its stage in project_stages: a check once that stage is validated.
  stageKey: string;
  // Absent when the step has no page yet: shown, but not a link.
  href?: (projectId: string) => string;
};

const t = fr.shell.project.workflowSteps;

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  {
    key: "framing",
    label: t.framing,
    stageKey: "framing",
    href: routes.projectFraming,
  },
  {
    key: "strategy",
    label: t.strategy,
    stageKey: "launch_strategy",
    href: routes.projectStrategy,
  },
  {
    key: "conception",
    label: t.conception,
    stageKey: "design",
    href: routes.projectDesign,
  },
  { key: "production", label: t.production, stageKey: "production" },
  {
    key: "delivery",
    label: t.delivery,
    stageKey: "delivery",
    href: routes.projectRelease,
  },
  { key: "defense", label: t.defense, stageKey: "defense" },
  { key: "wrap", label: t.wrap, stageKey: "review" },
];

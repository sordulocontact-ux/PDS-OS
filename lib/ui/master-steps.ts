import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// The internal path of the Master workflow (docs/ARCHITECTURE.md § 8
// septies), from the ticket "Workflow Master" (30/09/2026): source →
// Brief Mix/Master → Mix (versions, feedback, validation) → Mastering →
// Master final. Its own, never the project's 7 steps. Each step has its URL:
// the first is the section's entry (/master), the others a segment below.
export const MASTER_STEP_KEYS = [
  "state",
  "brief",
  "mix",
  "mastering",
  "final",
] as const;

export type MasterStepKey = (typeof MASTER_STEP_KEYS)[number];

// Steps with a page so far; the others show greyed, not linked, and their
// URL answers 404 (one lot at a time).
export const MASTER_BUILT_STEPS: readonly MasterStepKey[] = [
  "state",
  "brief",
  "mix",
  "mastering",
  "final",
];

export const masterStepHref = (projectId: string, key: MasterStepKey) =>
  key === MASTER_STEP_KEYS[0]
    ? routes.projectMaster(projectId)
    : routes.projectMasterStep(projectId, key);

/** The steps as SectionSteps draws them. */
export function masterSteps(projectId: string) {
  const t = fr.masterWorkflow.steps;
  return MASTER_STEP_KEYS.map((key) => ({
    key,
    label: t[key],
    href: masterStepHref(projectId, key),
    built: MASTER_BUILT_STEPS.includes(key),
  }));
}

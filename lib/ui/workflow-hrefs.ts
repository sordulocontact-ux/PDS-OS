import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  LEGAL_STEP_KEYS,
  legalChevronHref,
  type LegalStepKey,
} from "@/lib/ui/legal-steps";

// Where each step of a workflow is done (lib/workflow-status/rules.ts names
// the step): the overview's cards and actions open it. A step without a page
// (Production, Suivi & bilan) opens its workflow's entry.
export function workflowStepHref(
  projectId: string,
  workflow: string,
  step: string,
): string {
  switch (workflow) {
    case "master":
      return step === "prepare"
        ? routes.projectMaster(projectId)
        : routes.projectMasterStep(projectId, step === "mixing" ? "mix" : step);
    case "legal":
      return legalChevronHref(
        projectId,
        (LEGAL_STEP_KEYS as readonly string[]).includes(step)
          ? (step as LegalStepKey)
          : "inventory",
      );
    case "marketing":
      return step === "conception"
        ? routes.projectDesign(projectId)
        : step === "activations"
          ? routes.projectActivations(projectId)
          : routes.projectStrategy(projectId);
    default:
      return step === "online"
        ? routes.projectReleaseOnline(projectId)
        : routes.projectRelease(projectId);
  }
}

// Each workflow's chevrons, in order, as the overview's cards draw them
// (the same keys as lib/workflow-status/rules.ts).
const STEP_KEYS: Record<string, readonly string[]> = {
  master: ["prepare", "mixing", "mastering", "final"],
  legal: LEGAL_STEP_KEYS,
  marketing: ["strategy", "conception", "production", "activations", "review"],
  distribution: ["prepare", "online"],
};

export function workflowSteps(
  workflow: string,
): Array<{ key: string; label: string }> {
  // Only the steps' string labels are read (never the nested texts).
  const labels: Record<string, unknown> =
    workflow === "master"
      ? fr.masterWorkflow.steps
      : workflow === "legal"
        ? fr.shell.project.legalSteps
        : workflow === "marketing"
          ? fr.shell.project.marketingSteps
          : fr.shell.project.distributionSteps;
  return (STEP_KEYS[workflow] ?? []).map((key) => ({
    key,
    label: typeof labels[key] === "string" ? labels[key] : key,
  }));
}

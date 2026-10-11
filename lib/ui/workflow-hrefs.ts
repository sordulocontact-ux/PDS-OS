import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  DISTRIBUTION_STEPS,
  distributionStepHref,
  type DistributionStep,
} from "@/lib/ui/distribution-steps";

const isDistributionStep = (step: string): step is DistributionStep =>
  (DISTRIBUTION_STEPS as readonly string[]).includes(step);

// Where each step of a workflow is done (lib/workflow-status/rules.ts names
// the step): the overview's cards and actions open it.
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
      return step === "plan"
        ? routes.projectLegalStep(projectId, "plan")
        : routes.projectLegal(projectId);
    case "marketing":
      return step === "conception"
        ? routes.projectDesign(projectId)
        : step === "production"
          ? routes.projectProduction(projectId)
          : step === "activations"
            ? routes.projectActivations(projectId)
            : step === "review"
              ? routes.projectReview(projectId)
              : routes.projectStrategy(projectId);
    default:
      return isDistributionStep(step)
        ? distributionStepHref(projectId, step)
        : routes.projectRelease(projectId);
  }
}

// Each workflow's chevrons, in order, as the overview's cards draw them
// (the same keys as lib/workflow-status/rules.ts).
const STEP_KEYS: Record<string, readonly string[]> = {
  master: ["prepare", "mixing", "mastering", "final"],
  legal: ["inventory", "plan"],
  marketing: ["strategy", "conception", "production", "activations", "review"],
  distribution: DISTRIBUTION_STEPS,
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

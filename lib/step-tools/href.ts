// Where a step of a module opens, for a blocker or a note: the attention
// chips and the notifications lead there. Client-safe.

import { routes } from "@/lib/auth/redirects";
import type { StepModule } from "@/lib/step-tools/model";

export function stepHref(
  projectId: string,
  item: { module: StepModule; stepKey: string; subjectId: string | null },
): string {
  const { stepKey: step, subjectId: subject } = item;
  switch (item.module) {
    case "framing":
      return routes.projectFramingStep(projectId, step);
    case "strategy":
      return routes.projectStrategy(projectId);
    case "design":
      return routes.projectDesignStep(projectId, step);
    case "production":
      return subject
        ? routes.projectProductionStep(projectId, subject, step)
        : routes.projectProduction(projectId);
    case "activations":
      return subject
        ? routes.projectActivation(projectId, subject)
        : routes.projectActivations(projectId);
    case "review":
      return routes.projectReview(projectId);
    case "master":
      return routes.projectMasterStep(projectId, step);
    case "legal":
      return routes.projectLegalStep(projectId, step);
    case "distribution":
      return routes.projectRelease(projectId);
  }
}

import { routes } from "@/lib/auth/redirects";
import type { ProjectStage } from "@/lib/projects/types";

/**
 * What the owner of a launched project does next, decided by code from the
 * current stage (never by PO). The stage keys are those of stage_definitions.
 */
export type NextActionKind =
  | "record_call"
  | "write_brief"
  | "build_strategy"
  | "follow_design"
  | "prepare_release"
  | "run_stage"
  | "await_validation"
  | "done";

export type NextAction = { kind: NextActionKind; href: string };

// Pages that exist for a stage; the others open the project overview.
function stageHref(projectId: string, key: string): string {
  switch (key) {
    case "framing":
      return routes.projectFraming(projectId);
    case "launch_strategy":
      return routes.projectStrategy(projectId);
    case "delivery":
      return routes.projectRelease(projectId);
    default:
      return routes.project(projectId);
  }
}

export function nextActionOf(
  projectId: string,
  stage: ProjectStage | null,
  // A call report exists: no framing without one (framing_is_open in SQL).
  hasCallReport: boolean,
): NextAction {
  if (!stage) return { kind: "done", href: routes.project(projectId) };
  const href = stageHref(projectId, stage.key);
  if (stage.state === "awaiting_validation")
    return { kind: "await_validation", href };

  switch (stage.key) {
    case "framing":
      return hasCallReport
        ? { kind: "write_brief", href }
        : { kind: "record_call", href: routes.projectCalls(projectId) };
    case "launch_strategy":
      return { kind: "build_strategy", href };
    case "design":
      return { kind: "follow_design", href };
    case "delivery":
      return { kind: "prepare_release", href };
    default:
      return { kind: "run_stage", href };
  }
}

/** Waiting on someone else (or finished) comes after what the owner can do. */
export const isOwnerTurn = (action: NextAction): boolean =>
  action.kind !== "await_validation" && action.kind !== "done";

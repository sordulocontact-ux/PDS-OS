// Which workflow a deadline of the Cadrage feeds (PROJ-UX-05), decided by
// code from its kind: the master final date is proposed to the Brief
// Mix/Master (lib/master-workflow/framing-defaults.ts), the delivery and the
// release to the Distribution, a promotion peak to the Marketing. Client-safe.

export type DeadlineWorkflow = "master" | "distribution" | "marketing";

export function deadlineWorkflows(kind: string): DeadlineWorkflow[] {
  switch (kind) {
    case "master_final":
      return ["master"];
    case "delivery":
      return ["distribution"];
    case "release":
      return ["distribution", "marketing"];
    case "promotion":
      return ["marketing"];
    default:
      return [];
  }
}

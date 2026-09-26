import { can, type Access } from "@/lib/auth/access";
import type { ProjectListItem } from "@/lib/projects/types";

/**
 * Projects waiting on the viewer in the handover circuit, decided by code from
 * the computed project status. Shared by the home and the work page.
 */
export function handoverOf(projects: ProjectListItem[], access: Access) {
  const toAccept = projects.filter(
    (p) =>
      p.status === "pending" &&
      p.latestAssignment?.assigneePersonId === access.personId,
  );
  const canAssign = can(access, "assign_projects");
  const toRetransmit = canAssign
    ? projects.filter(
        (p) => p.status === "refused" || p.status === "clarification_requested",
      )
    : [];
  // Transmitted by the director, not answered yet by the project manager.
  const awaitingAcceptance = canAssign
    ? projects.filter((p) => p.status === "pending")
    : [];
  return { toAccept, toRetransmit, awaitingAcceptance };
}

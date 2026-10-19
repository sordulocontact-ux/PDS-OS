import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { freeTasksOf, loadMyTodo, type Todo } from "@/lib/insights/todo";
import { handoverOf } from "@/lib/projects/handover";
import { listProjects } from "@/lib/projects/queries";
import type { ProjectListItem } from "@/lib/projects/types";

export type MyWork = {
  error: boolean;
  // Tasks tied to no workflow (a call's report): the journeys do not carry
  // them.
  tasks: Todo["tasks"];
  toAccept: ProjectListItem[];
  // assign_projects
  toRetransmit: ProjectListItem[];
  awaitingAcceptance: ProjectListItem[];
  // pilot_projects: PO's proposals in the projects the viewer runs.
  proposals: Todo["proposals"];
};

/**
 * The global Travail of the signed-in person (docs/VISION-UX.md § 3, « Une
 * seule source »): what waits for them in the projects is read from the
 * journeys (lib/work/journeys.ts, streamed by WorkJourneyCards), never from
 * a list of its own; here, what comes before a project's journeys (a
 * project to accept, to transmit again), PO's proposals and the tasks tied
 * to no workflow. Read with the user's session (RLS).
 */
export async function loadMyWork(access: Access): Promise<MyWork> {
  const [todo, { projects, error }] = await Promise.all([
    loadMyTodo(access),
    listProjects(),
  ]);
  const me = access.personId ?? "";
  // Only the owner writes in a launched project, so only they review.
  const owned = new Set(
    projects
      .filter((p) => p.status === "launched" && p.ownerPersonId === me)
      .map((p) => p.id),
  );
  const { toAccept, toRetransmit, awaitingAcceptance } = handoverOf(
    projects,
    access,
  );
  return {
    error: error || todo.error,
    tasks: freeTasksOf(todo),
    toAccept,
    toRetransmit,
    awaitingAcceptance,
    proposals: can(access, "pilot_projects")
      ? todo.proposals.filter((p) => owned.has(p.projectId))
      : [],
  };
}

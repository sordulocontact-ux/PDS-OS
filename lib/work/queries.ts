import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { loadMyDealWork, type DealWork } from "@/lib/deals/work";
import { freeTasksOf, loadMyTodo, type Todo } from "@/lib/insights/todo";
import { handoverOf } from "@/lib/projects/handover";
import { listProjects } from "@/lib/projects/queries";
import type { ProjectListItem } from "@/lib/projects/types";
import { listSessionsToReport } from "@/lib/sessions/queries";
import type { StudioSessionRow } from "@/lib/sessions/types";

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
  // Studio sessions over whose report the viewer writes (no workflow).
  sessions: StudioSessionRow[];
  // The deals' actions (BIZ 4): the direction's decisions, the negotiator's
  // moves on the deals assigned to him (no workflow, no project needed).
  deals: DealWork[];
};

/**
 * The global Travail of the signed-in person (docs/VISION-UX.md § 3, « Une
 * seule source »): what waits for them in the projects is read from the
 * journeys (lib/work/journeys.ts, shown by WorkList), never from
 * a list of its own; here, what comes before a project's journeys (a
 * project to accept, to transmit again), PO's proposals, the tasks tied
 * to no workflow, the studio sessions' reports to write and the deals'
 * actions. Read with the user's session (RLS).
 */
export async function loadMyWork(access: Access): Promise<MyWork> {
  const [todo, { projects, error }, toReport, dealWork] = await Promise.all([
    loadMyTodo(access),
    listProjects(),
    listSessionsToReport(access.personId),
    loadMyDealWork(access),
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
    error: error || todo.error || toReport.error || dealWork.error,
    tasks: freeTasksOf(todo),
    toAccept,
    toRetransmit,
    awaitingAcceptance,
    proposals: can(access, "pilot_projects")
      ? todo.proposals.filter((p) => owned.has(p.projectId))
      : [],
    sessions: toReport.sessions,
    deals: dealWork.items,
  };
}

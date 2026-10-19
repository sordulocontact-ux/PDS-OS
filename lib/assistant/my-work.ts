import "server-only";

import { formatDay, lateness } from "@/lib/assistant/facts";
import { uniqueSources, type Source } from "@/lib/assistant/sources";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { isOverdue, todayInParis } from "@/lib/insights/dates";
import { freeTasksOf, loadMyTodo } from "@/lib/insights/todo";
import { handoverOf } from "@/lib/projects/handover";
import { listProjects } from "@/lib/projects/queries";
import { loadMyJourneyWork } from "@/lib/work/journeys";

/**
 * What waits for the signed-in person, for PO's `my_todo` (docs/
 * ASSISTANT.md § 3): the very lists of the home and the global Travail
 * (docs/VISION-UX.md § 3, « Une seule source »). First the projects
 * transmitted to them (to accept), then their actions read from the
 * projects' journeys (lib/work/journeys.ts: decisions first, each with its
 * project, its place « Module › Étape » and its due date), then the tasks
 * tied to no workflow and PO's proposals in the projects they run. Phrased
 * by code; lateness computed, never by the model.
 */
export async function myWorkFacts(
  access: Access,
): Promise<{ facts: string[]; sources: Source[] }> {
  const [work, todo, { projects }] = await Promise.all([
    loadMyJourneyWork(),
    loadMyTodo(access),
    listProjects(),
  ]);
  const t = fr.assistant.myWork;
  const today = todayInParis();
  const { toAccept } = handoverOf(projects, access);
  const me = access.personId ?? "";
  const owned = new Set(
    projects
      .filter((p) => p.status === "launched" && p.ownerPersonId === me)
      .map((p) => p.id),
  );
  const proposals = can(access, "pilot_projects")
    ? todo.proposals.filter((p) => owned.has(p.projectId))
    : [];
  const tasks = freeTasksOf(todo);
  const actions = work.projects.flatMap((w) =>
    w.mine.map((action) => ({ action, projectTitle: w.projectTitle })),
  );
  // Decisions first (the home's « Validations qui m'attendent »).
  actions.sort(
    (a, b) =>
      Number(b.action.step.actor?.kind === "validate") -
      Number(a.action.step.actor?.kind === "validate"),
  );

  const facts = [
    ...(work.error || todo.error ? [fr.assistant.readFailed] : []),
    ...toAccept.map((p) => t.toAccept(p.title, p.artistName)),
    ...actions.map(({ action, projectTitle }) => {
      const due = action.step.due ?? null;
      return t.action({
        todo: action.step.actor?.todo ?? action.step.title,
        project: projectTitle,
        place: `${action.place} › ${action.step.title}`,
        decision: action.step.actor?.kind === "validate",
        due: due ? formatDay(due) : null,
        late: lateness(due !== null && isOverdue(due.slice(0, 10), today)),
      });
    }),
    ...tasks.map((task) =>
      t.task({
        title: task.title,
        project: task.projectTitle,
        due: task.dueDate ? formatDay(task.dueDate) : null,
        late: lateness(task.overdue),
      }),
    ),
    ...proposals.map((p) => t.proposals(p.count, p.projectTitle)),
  ];
  return {
    facts: facts.length ? facts : [t.nothing],
    sources: uniqueSources([
      ...toAccept.map((p) => ({
        label: `${p.title} · ${t.toAcceptSource}`,
        href: routes.project(p.id),
      })),
      ...actions.map(({ action, projectTitle }) => ({
        label: `${projectTitle} · ${action.step.actor?.todo ?? action.step.title}`,
        href: action.step.href,
      })),
      ...tasks.map((task) => ({
        label: `${task.projectTitle} · ${task.title}`,
        href: task.href,
      })),
      ...proposals.map((p) => ({
        label: `${p.projectTitle} · ${t.proposalsSource}`,
        href: p.href,
      })),
    ]),
  };
}

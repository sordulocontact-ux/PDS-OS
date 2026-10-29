import { ActionTaskButton } from "@/components/calls/action-task-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { matchByName } from "@/lib/assistant/fuzzy-name";
import type { CallAction } from "@/lib/calls/outcomes";
import { calls } from "@/lib/i18n/fr/calls";

const fr = { calls };

const dueFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * The actions of a call (proto `docs/protos/pages.html`): each with the
 * sentence it comes from; one turned into a task says who and for when, the
 * others offer « Créer la tâche » to whoever may create it.
 */
export function CallActionList({
  actions,
  members,
  projectId,
  projects,
  deliverableId = null,
}: {
  actions: CallAction[];
  members: { personId: string; name: string }[];
  projectId: string | null;
  projects: { id: string; title: string }[];
  // The deliverable a creative exchange is about (MKT-C2-05).
  deliverableId?: string | null;
}) {
  const t = fr.calls.outcomes;
  const p = fr.calls.page.task;
  const canConvert = projects.length > 0;

  return (
    <ul className="flex flex-col">
      {actions.map((action) => (
        <li
          key={action.id}
          className="flex flex-col gap-2 border-b border-[var(--border-hairline)] py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <b className="text-body-md font-semibold break-words">
              {action.what}
              {action.who && (
                <span className="font-medium text-[color:var(--text-secondary)]">
                  {" "}
                  — {action.who}
                </span>
              )}
            </b>
            {action.quote && (
              <span className="text-caption text-[color:var(--text-secondary)]">
                {p.why(action.quote)}
              </span>
            )}
            {action.task ? (
              <span className="flex flex-wrap items-center gap-2 text-caption text-[color:var(--text-secondary)]">
                <StatusBadge
                  tone={action.task.done ? "success" : "info"}
                  size="sm"
                >
                  {action.task.done ? t.taskDone : t.taskCreated}
                </StatusBadge>
                {p.line(
                  action.task.assigneeName,
                  dueFormat.format(new Date(`${action.task.dueDate}T12:00:00`)),
                  // The project is only worth naming outside it.
                  projectId ? "" : action.task.projectTitle,
                )}
              </span>
            ) : (
              !canConvert && (
                <span className="text-caption text-[color:var(--text-secondary)]">
                  {projectId ? t.notConverted : t.noProject}
                </span>
              )
            )}
          </span>
          {!action.task && canConvert && (
            <span className="shrink-0 self-start">
              <ActionTaskButton
                action={action}
                members={members}
                // The person named in the call when it clearly is a member
                // (« Yannis » → Yanis Roche); otherwise nobody, chosen by
                // hand (UX test of 09/10/2026).
                defaultAssigneeId={
                  action.who
                    ? (matchByName(members, action.who, (m) => m.name)
                        ?.personId ?? "")
                    : ""
                }
                projectId={projectId}
                projects={projects}
                deliverableId={deliverableId}
              />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

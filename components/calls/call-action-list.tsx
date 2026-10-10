"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { ActionTaskForm } from "@/components/project-work/action-task-form";
import { matchByName } from "@/lib/assistant/fuzzy-name";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CallAction } from "@/lib/calls/outcomes";
import { createTask } from "@/lib/framing/actions/points-tasks";
import { fr } from "@/lib/i18n/fr";

const dueFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * The actions of a call: those already turned into a task say so (who, when,
 * which project); the others offer the task form to whoever may create it.
 */
export function CallActionList({
  actions,
  members,
  projectId,
  projects,
}: {
  actions: CallAction[];
  members: { personId: string; name: string }[];
  projectId: string | null;
  projects: { id: string; title: string }[];
}) {
  const t = fr.calls.outcomes;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const canConvert = projects.length > 0;

  return (
    <ul className="grid gap-3">
      {actions.map((action) => {
        if (action.task) {
          const { task } = action;
          return (
            <li key={action.id} className="grid gap-1 text-sm">
              <ActionText action={action} />
              <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
                <StatusBadge tone={task.done ? "success" : "info"} size="sm">
                  {task.done ? t.taskDone : t.taskCreated}
                </StatusBadge>
                {t.task(
                  task.assigneeName,
                  dueFormat.format(new Date(`${task.dueDate}T12:00:00`)),
                  // The project is only worth naming outside it.
                  projectId ? "" : task.projectTitle,
                )}
              </span>
            </li>
          );
        }
        if (!canConvert)
          return (
            <li key={action.id} className="grid gap-0.5 text-sm">
              <ActionText action={action} />
              <span className="text-muted-foreground">
                {projectId ? t.notConverted : t.noProject}
              </span>
            </li>
          );
        return (
          <li key={action.id}>
            <ActionTaskForm
              item={action}
              members={members}
              // The person named in the call when it clearly is a member
              // (« Yannis » → Yanis Roche); otherwise nobody, chosen by hand
              // (UX test of 09/10/2026: pre-assigned to whoever opened it).
              defaultAssigneeId={
                action.who
                  ? (matchByName(members, action.who, (m) => m.name)
                      ?.personId ?? "")
                  : ""
              }
              projectId={projectId ?? undefined}
              projects={projectId ? undefined : projects}
              pending={pending}
              onSubmit={(values) =>
                run(
                  () =>
                    createTask(values.projectId, {
                      title: action.what,
                      assigneePersonId: values.assigneePersonId,
                      dueDate: values.dueDate,
                      sourceReportItemId: action.id,
                    }),
                  () => {
                    toast.success(t.created);
                    router.refresh();
                  },
                )
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

// What the action is, and who said it would do it.
function ActionText({ action }: { action: CallAction }) {
  return (
    <span>
      {action.what}
      {action.who && (
        <span className="text-muted-foreground"> — {action.who}</span>
      )}
    </span>
  );
}

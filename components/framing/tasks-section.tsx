"use client";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { ActionTaskForm } from "@/components/project-work/action-task-form";
import { useCanEditProject } from "@/components/projects/edit-access";
import { createTask, setTaskDone } from "@/lib/framing/actions/points-tasks";
import type { FramingData } from "@/lib/framing/queries";
import { fr } from "@/lib/i18n/fr";

const dueFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

type Props = Pick<FramingData, "tasks" | "proposedActions" | "members"> & {
  projectId: string;
  mePersonId: string | null;
};

/** Proposed actions become tasks only once a person picks an owner and a date. */
export function TasksSection({
  tasks,
  proposedActions,
  members,
  projectId,
  mePersonId,
}: Props) {
  const t = fr.framing.tasks;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const people = Object.fromEntries(members.map((m) => [m.personId, m.name]));
  return (
    <div className="grid gap-4">
      {canEdit && proposedActions.length > 0 && (
        <div className="grid gap-3">
          <div className="grid gap-0.5">
            <p className="text-xs font-medium">{t.proposedTitle}</p>
            <p className="text-xs text-muted-foreground">{t.proposedHint}</p>
          </div>
          {proposedActions.map((item) => (
            <ActionTaskForm
              key={item.id}
              item={item}
              members={members}
              defaultAssigneeId={mePersonId ?? members[0]?.personId ?? ""}
              projectId={projectId}
              pending={pending}
              onSubmit={(values) =>
                run(() =>
                  createTask(projectId, {
                    title: item.what,
                    assigneePersonId: values.assigneePersonId,
                    dueDate: values.dueDate,
                    sourceReportItemId: item.id,
                  }),
                )
              }
            />
          ))}
        </div>
      )}
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="grid gap-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-2 text-sm">
              {/* The assignee may tick their own task even without edit rights;
                  anyone else only reads its state. */}
              {canEdit || task.assignee_person_id === mePersonId ? (
                <input
                  type="checkbox"
                  id={`task-${task.id}`}
                  className="mt-1 size-4 accent-selection"
                  checked={task.status === "done"}
                  disabled={pending}
                  onChange={(e) =>
                    run(() => setTaskDone(projectId, task.id, e.target.checked))
                  }
                />
              ) : null}
              <label
                htmlFor={`task-${task.id}`}
                className={
                  task.status === "done"
                    ? "text-muted-foreground line-through"
                    : ""
                }
              >
                {task.title}
                <span className="block text-xs text-muted-foreground">
                  {people[task.assignee_person_id] ?? "—"} ·{" "}
                  {dueFormat.format(new Date(`${task.due_date}T12:00:00`))}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

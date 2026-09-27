"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [drafts, setDrafts] = useState<
    Record<string, { assignee: string; due: string }>
  >({});
  const draftOf = (id: string) =>
    drafts[id] ?? {
      assignee: mePersonId ?? members[0]?.personId ?? "",
      due: "",
    };
  const setDraft = (
    id: string,
    patch: Partial<{ assignee: string; due: string }>,
  ) => setDrafts((all) => ({ ...all, [id]: { ...draftOf(id), ...patch } }));

  return (
    <div className="grid gap-4">
      {canEdit && proposedActions.length > 0 && (
        <div className="grid gap-3">
          <div className="grid gap-0.5">
            <p className="text-xs font-medium">{t.proposedTitle}</p>
            <p className="text-xs text-muted-foreground">{t.proposedHint}</p>
          </div>
          {proposedActions.map((item) => {
            const draft = draftOf(item.id);
            return (
              <form
                key={item.id}
                className="grid gap-2 rounded-lg border border-dashed border-border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() =>
                    createTask(projectId, {
                      title: item.what,
                      assigneePersonId: draft.assignee,
                      dueDate: draft.due,
                      sourceReportItemId: item.id,
                    }),
                  );
                }}
              >
                <p className="text-sm">
                  {item.what}
                  {item.who && (
                    <span className="text-muted-foreground"> — {item.who}</span>
                  )}
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor={`as-${item.id}`}>{t.assignee}</Label>
                    <OptionSelect
                      id={`as-${item.id}`}
                      label={t.assignee}
                      options={people}
                      value={draft.assignee}
                      onChange={(v) => setDraft(item.id, { assignee: v })}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`due-${item.id}`}>{t.dueDate}</Label>
                    <Input
                      id={`due-${item.id}`}
                      type="date"
                      value={draft.due}
                      onChange={(e) =>
                        setDraft(item.id, { due: e.target.value })
                      }
                      className="w-auto"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={pending || !draft.assignee || !draft.due}
                  >
                    {t.create}
                  </Button>
                </div>
              </form>
            );
          })}
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
                  className="mt-1 size-4 accent-primary"
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

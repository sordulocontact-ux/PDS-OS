"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTask } from "@/lib/framing/actions/points-tasks";
import type { Member } from "@/lib/framing/related";
import { projectWork } from "@/lib/i18n/fr/project-work";
import { cn } from "@/lib/utils";

const fr = { projectWork };

const t = fr.projectWork.work.add;
// The « none » choice of the deliverable menu (a Select value is never empty).
const NO_DELIVERABLE = "none";

export type TaskDeliverable = { id: string; title: string };

/**
 * A free task on the project's to-do list (owner only): title, owner and due
 * date are all required, chosen by a person — PO may only pre-fill them.
 */
export function AddTaskForm({
  projectId,
  members,
  deliverables,
  defaultAssignee,
}: {
  projectId: string;
  members: Member[];
  deliverables: TaskDeliverable[];
  defaultAssignee: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (!open)
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        {t.open}
      </Button>
    );

  return (
    <TaskForm
      framed
      projectId={projectId}
      members={members}
      deliverables={deliverables}
      initial={{ title: "", assigneePersonId: defaultAssignee, dueDate: "" }}
      onDone={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    />
  );
}

/**
 * The task's fields. `framed`: inline on the Travail page, with its own
 * title; without it, inside a panel that already has one (PO's draft).
 * `deliverables`: the task may name the one it is about, and then leads to
 * it in the Conception.
 */
export function TaskForm({
  projectId,
  members,
  deliverables = [],
  initial,
  framed = false,
  onDone,
  onCancel,
}: {
  projectId: string;
  members: Member[];
  deliverables?: TaskDeliverable[];
  initial: { title: string; assigneePersonId: string | null; dueDate: string };
  framed?: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [assignee, setAssignee] = useState(
    initial.assigneePersonId ?? members[0]?.personId ?? "",
  );
  const [due, setDue] = useState(initial.dueDate);
  const [deliverable, setDeliverable] = useState(NO_DELIVERABLE);
  const { pending, run } = useFramingAction();
  const people = Object.fromEntries(members.map((m) => [m.personId, m.name]));

  return (
    <form
      aria-label={t.title}
      className={cn(
        "grid w-full gap-3",
        framed && "rounded-2xl border border-border bg-card p-4",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            createTask(projectId, {
              title,
              assigneePersonId: assignee,
              dueDate: due,
              sourceReportItemId: null,
              deliverableId:
                deliverable === NO_DELIVERABLE ? null : deliverable,
            }),
          onDone,
        );
      }}
    >
      {framed && (
        <div className="grid gap-0.5">
          <p className="text-sm font-medium">{t.title}</p>
          <p className="text-xs text-muted-foreground">{t.hint}</p>
        </div>
      )}
      <div className="grid gap-1">
        <Label htmlFor="new-task-title" required>
          {t.label}
        </Label>
        <Input
          id="new-task-title"
          aria-required
          value={title}
          maxLength={300}
          placeholder={t.placeholder}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label htmlFor="new-task-assignee" required>
            {t.assignee}
          </Label>
          <OptionSelect
            id="new-task-assignee"
            required
            label={t.assignee}
            options={people}
            value={assignee}
            onChange={setAssignee}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="new-task-due" required>
            {t.dueDate}
          </Label>
          <Input
            id="new-task-due"
            aria-required
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-auto"
          />
        </div>
        {deliverables.length > 0 && (
          <div className="grid gap-1">
            <Label htmlFor="new-task-deliverable">{t.deliverable}</Label>
            <OptionSelect
              id="new-task-deliverable"
              label={t.deliverable}
              options={{
                [NO_DELIVERABLE]: t.noDeliverable,
                ...Object.fromEntries(deliverables.map((d) => [d.id, d.title])),
              }}
              value={deliverable}
              onChange={setDeliverable}
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={pending || !title.trim() || !assignee || !due}
          >
            {t.submit}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            {t.cancel}
          </Button>
        </div>
      </div>
    </form>
  );
}

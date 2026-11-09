"use client";

import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { toast } from "@/components/ui/toast";
import { work } from "@/lib/i18n/fr/work";
import {
  addPersonalTask,
  updatePersonalTask,
} from "@/lib/work/personal-task-actions";
import { quadrantOf, type PersonalTask } from "@/lib/work/personal-tasks";

import { QuadrantBadge } from "./quadrant-badge";

const fr = { work };

export type TaskEdit = Pick<PersonalTask, "title" | "dueDate" | "important">;

type Importance = "important" | "secondary";

/**
 * A task of « Mes tâches » in its modal: « Ajouter une tâche » (no `task`)
 * or « Modifier » of its « ⋯ ». Its wording, its due date (or none), its
 * importance; below, the box of the matrix it goes to, the urgency coming
 * from the date.
 */
export function TaskForm({
  task,
  today,
  onDone,
  onSaved,
}: {
  task?: PersonalTask;
  today: string;
  onDone: () => void;
  onSaved: (next: TaskEdit) => void;
}) {
  const t = fr.work.tasks.form;
  const [title, setTitle] = useState(task?.title ?? "");
  const [due, setDue] = useState(task?.dueDate ?? "");
  const [importance, setImportance] = useState<Importance>(
    task?.important ? "important" : "secondary",
  );
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const missing = !title.trim();
  const next: TaskEdit = {
    title: title.trim(),
    dueDate: due || null,
    important: importance === "important",
  };
  const box = quadrantOf(
    {
      id: task?.id ?? "",
      projectId: null,
      done: false,
      doneAt: null,
      source: null,
      // Said urgent by a move to a box: kept.
      urgent: task?.urgent ?? false,
      ...next,
    },
    today,
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (missing) return document.getElementById("task-title")?.focus();
        startTransition(async () => {
          const res = task
            ? await updatePersonalTask(task.id, next)
            : await addPersonalTask(next);
          if (!res.ok) return setFailed(true);
          toast.success(task ? t.edited : t.added);
          onSaved(next);
          onDone();
        });
      }}
    >
      {failed && <FormMessage kind="error">{fr.work.tasks.failed}</FormMessage>}
      <Field
        id="task-title"
        name="title"
        label={t.name}
        placeholder={t.namePlaceholder}
        aria-required
        maxLength={300}
        autoComplete="off"
        autoFocus={!task}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={tried && missing ? t.nameMissing : undefined}
      />
      <Field
        name="due"
        type="date"
        label={t.due}
        hint={t.dueHint}
        value={due}
        onChange={(event) => setDue(event.target.value)}
      />
      <ChipChoice
        name="importance"
        legend={t.importance}
        options={[
          { value: "important", label: t.important },
          { value: "secondary", label: t.secondary },
        ]}
        value={importance}
        onChange={(value) => value && setImportance(value)}
        fill
      />
      <p className="flex flex-wrap items-center gap-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        {t.goesTo}
        <QuadrantBadge quadrant={box} />
      </p>
      <DialogFormActions
        onCancel={onDone}
        submitLabel={task ? t.save : t.submit}
        pending={pending}
      />
    </form>
  );
}

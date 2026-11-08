"use client";

import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { toast } from "@/components/ui/toast";
import { work } from "@/lib/i18n/fr/work";
import { updatePersonalTask } from "@/lib/work/personal-task-actions";
import type { PersonalTask } from "@/lib/work/personal-tasks";

const fr = { work };

export type TaskEdit = Pick<PersonalTask, "title" | "dueDate" | "important">;

/** « Modifier » of a task of « Mes tâches »: its wording, its date (or
 * none), its importance. */
export function TaskEditForm({
  task,
  onDone,
  onSaved,
}: {
  task: PersonalTask;
  onDone: () => void;
  onSaved: (next: TaskEdit) => void;
}) {
  const t = fr.work.tasks.edit;
  const [title, setTitle] = useState(task.title);
  const [due, setDue] = useState(task.dueDate ?? "");
  const [important, setImportant] = useState(task.important);
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const missing = !title.trim();

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (missing) return document.getElementById("edit-task-title")?.focus();
        const next = {
          title: title.trim(),
          dueDate: due || null,
          important,
        };
        startTransition(async () => {
          const res = await updatePersonalTask(task.id, next);
          if (!res.ok) return setFailed(true);
          toast.success(t.done);
          onSaved(next);
          onDone();
        });
      }}
    >
      {failed && <FormMessage kind="error">{fr.work.tasks.failed}</FormMessage>}
      <Field
        id="edit-task-title"
        name="title"
        label={t.name}
        aria-required
        maxLength={300}
        autoComplete="off"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={tried && missing ? fr.work.tasks.add.titleMissing : undefined}
      />
      <Field
        name="due"
        type="date"
        label={t.due}
        hint={t.dueHint}
        value={due}
        onChange={(event) => setDue(event.target.value)}
      />
      <CheckboxField
        label={t.important}
        checked={important}
        onChange={setImportant}
      />
      <DialogFormActions
        onCancel={onDone}
        submitLabel={t.submit}
        pending={pending}
      />
    </form>
  );
}

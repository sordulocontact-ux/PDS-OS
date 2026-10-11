"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import type { FollowUp } from "@/lib/production/shoot/follow-ups";
import { createShootTask } from "@/lib/production/shoot/task-actions";

import { ShootFormActions } from "./shoot-form-actions";

const t = fr.productionShoot.followUps;

/** « Créer la tâche »: the person confirms the title, chooses who and when;
 * nothing is created before. */
export function FollowUpTaskButton({
  projectId,
  followUp,
  members,
}: {
  projectId: string;
  followUp: FollowUp;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t.create}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.dialogDescription}
        closeLabel={fr.productionShoot.close}
      >
        <TaskForm
          projectId={projectId}
          followUp={followUp}
          members={members}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

type Missing = { title?: boolean; assignee?: boolean; due?: boolean };

function TaskForm({
  projectId,
  followUp,
  members,
  onDone,
}: {
  projectId: string;
  followUp: FollowUp;
  members: Member[];
  onDone: () => void;
}) {
  const [missing, setMissing] = useState<Missing>({});
  const { pending, error, run } = useWriteSubmit(onDone, t.created);
  const prefix = `follow-up-${followUp.key.replace(/[^a-z0-9-]/gi, "-")}`;

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const fields = {
      title: text("title"),
      assigneePersonId: text("assignee"),
      dueDate: text("dueDate"),
    };
    const next = {
      title: fields.title === "",
      assignee: fields.assigneePersonId === "",
      due: fields.dueDate === "",
    };
    setMissing(next);
    const first = (["title", "assignee", "due"] as const).find((k) => next[k]);
    if (first) {
      form.querySelector<HTMLElement>(`#${prefix}-${first}`)?.focus();
      return;
    }
    run(() => createShootTask({ projectId, ...fields }));
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <Field
        id={`${prefix}-title`}
        name="title"
        label={t.taskTitle}
        aria-required
        autoComplete="off"
        maxLength={300}
        defaultValue={followUp.title}
        hint={followUp.reason}
        error={missing.title ? t.missingTitle : undefined}
      />
      <OptionSelect
        id={`${prefix}-assignee`}
        name="assignee"
        label={t.assignee}
        placeholder={t.assigneePlaceholder}
        required
        items={Object.fromEntries(members.map((m) => [m.personId, m.name]))}
        defaultValue={followUp.assigneePersonId}
        error={missing.assignee ? t.missingAssignee : undefined}
      />
      <Field
        id={`${prefix}-due`}
        name="dueDate"
        label={t.due}
        type="date"
        aria-required
        defaultValue={followUp.dueDate ?? ""}
        error={missing.due ? t.missingDue : undefined}
      />
      <ShootFormActions
        pending={pending}
        error={error}
        submitLabel={t.create}
        onCancel={onDone}
      />
    </form>
  );
}

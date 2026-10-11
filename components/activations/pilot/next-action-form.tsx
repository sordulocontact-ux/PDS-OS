"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  createActivationTask,
  saveNextAction,
} from "@/lib/activations/pilot-actions";
import type { NextAction } from "@/lib/activations/types";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";

import { MemberSelect, memberValue } from "../member-select";

const t = fr.activations.next;

/**
 * Two uses : « Modifier » writes a person's own next action (it replaces the
 * recommendation while open) ; « Créer une tâche » makes the task in Travail,
 * with whom and when — the only way a task is ever created from here.
 */
export function NextActionForm({
  mode,
  projectId,
  activationId,
  next,
  members,
  onDone,
}: {
  mode: "edit" | "task";
  projectId: string;
  activationId: string;
  next: NextAction | null;
  members: Member[];
  onDone: () => void;
}) {
  const [errors, setErrors] = useState<{
    label?: string;
    person?: string;
    due?: string;
  }>({});
  const task = mode === "task";
  const { pending, error, run } = useWriteSubmit(
    onDone,
    task ? t.taskCreated : t.saved,
  );

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const label = String(data.get("label") ?? "").trim();
    const person = memberValue(data, "person");
    const due = String(data.get("due") ?? "");
    const next_ = {
      label: label ? undefined : fr.activations.errors.labelRequired,
      person:
        task && !person ? fr.activations.errors.personRequired : undefined,
      due: task && !due ? fr.activations.errors.dateRequired : undefined,
    };
    setErrors(next_);
    if (next_.label || next_.person || next_.due) return;
    run(() =>
      task
        ? createActivationTask({
            projectId,
            activationId,
            origin: next?.origin ?? "manual",
            label,
            assigneePersonId: person,
            dueDate: due,
          })
        : saveNextAction({
            projectId,
            activationId,
            rowId: next?.origin === "manual" ? next.rowId : null,
            origin: "manual",
            label,
            expectedPersonId: person,
            dueOn: due,
            status: "open",
          }),
    );
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
        name="label"
        label={t.label}
        required
        maxLength={300}
        defaultValue={next?.label ?? ""}
        error={errors.label}
      />
      <MemberSelect
        name="person"
        label={task ? t.assignee : t.expected}
        members={members}
        required={task}
        noneLabel={task ? undefined : fr.activations.noOwner}
        defaultValue={next?.expectedPersonId ?? null}
        error={errors.person}
      />
      <Field
        name="due"
        type="date"
        label={t.due}
        required={task}
        defaultValue={next?.dueOn ?? ""}
        error={errors.due}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : task ? t.createTask : t.edit}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { DialogFormActions } from "@/components/production/prep/need-dialog-actions";
import { usePrepSubmit } from "@/components/production/prep/use-prep-submit";
import { OptionSelect } from "@/components/projects/option-select";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { createTaskFromAction } from "@/lib/production/preprod/actions-plan-task";
import type { PlanAction } from "@/lib/production/preprod/types";

const t = fr.productionPreprod.plan;

/**
 * « Créer dans Travail », the explicit confirmation: a task needs a member
 * of PDS and a date, prefilled from the action when it has them; it is
 * created once.
 */
export function PlanTaskForm({
  projectId,
  action,
  members,
  onDone,
}: {
  projectId: string;
  action: PlanAction;
  members: Member[];
  onDone: () => void;
}) {
  const { pending, error, run } = usePrepSubmit(onDone, t.taskCreated);
  const pressenti =
    action.holder?.kind === "person" &&
    members.some((m) => m.personId === action.holder?.id)
      ? action.holder.id
      : null;
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        run(() =>
          createTaskFromAction({
            projectId,
            actionId: action.id,
            assigneePersonId: String(data.get("assignee") ?? ""),
            dueDate: String(data.get("dueDate") ?? ""),
          }),
        );
      }}
    >
      <p className="text-sm font-medium">{action.title}</p>
      <OptionSelect
        id={`task-${action.id}-assignee`}
        name="assignee"
        label={t.taskAssignee}
        required
        items={Object.fromEntries(members.map((m) => [m.personId, m.name]))}
        defaultValue={pressenti}
      />
      <Field
        id={`task-${action.id}-due`}
        name="dueDate"
        type="date"
        label={t.taskDue}
        required
        defaultValue={action.dueDate ?? ""}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.taskConfirm}
        onCancel={onDone}
      />
    </form>
  );
}

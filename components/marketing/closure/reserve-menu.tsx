"use client";

import {
  IconCheck,
  IconLink,
  IconPenWriting2,
  IconPlus,
} from "nucleo-sharp-essential";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ArbitrateForm } from "@/components/marketing/closure/arbitrate-form";
import { OptionSelect } from "@/components/projects/option-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import {
  createReserveTask,
  liftReserve,
  linkReserveTask,
  noteReserve,
} from "@/lib/marketing/closure/reserve-actions";
import type { ReserveDecision } from "@/lib/marketing/closure/reserves";
import type { WriteResult } from "@/lib/utils/write-result";

const t = fr.marketingReview.closure.reserves;
const NONE = "none";

type Dialog = "arbitrate" | "lift" | "note" | "task" | "link" | null;

export type ReserveMenuReserve = {
  id: string;
  description: string;
  status: string;
  decision: ReserveDecision | null;
  reason: string | null;
  followUp: {
    personId: string | null;
    dueOn: string | null;
    channel: string | null;
    note: string | null;
  };
  taskId: string | null;
};

/**
 * The « ⋯ » of a reserve: what the viewer may do with it — the owner
 * arbitrates, lifts and puts a task behind a follow-up; the direction
 * accepts a definitive limit; whoever follows it notes and lifts it.
 */
export function ReserveMenu({
  projectId,
  reserve: r,
  role,
  members,
  others,
  tasks,
  inline = false,
}: {
  projectId: string;
  // The step « Réserves » arbitrates an open reserve and lifts one in
  // place: the menu keeps the rest (re-arbitrate, note, tasks).
  inline?: boolean;
  reserve: ReserveMenuReserve;
  role: {
    owner: boolean;
    direction: boolean;
    follower: boolean;
    closed: boolean;
  };
  members: { personId: string; name: string }[];
  others: { id: string; label: string }[];
  tasks: { id: string; title: string }[];
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setError(null);
    setDialog(null);
  };
  const live = r.status === "open" || r.status === "arbitrated";
  // The direction accepts a definitive limit; the owner decides the rest.
  const decisions: ReserveDecision[] = [
    ...(role.owner
      ? (["blocking", "follow_up", "not_applicable", "duplicate"] as const)
      : []),
    ...(role.direction ? (["accepted_limit"] as const) : []),
  ];
  const liftable =
    r.status === "arbitrated" &&
    (r.decision === "blocking" || r.decision === "follow_up") &&
    (role.owner || role.follower);
  const followUp = r.status === "arbitrated" && r.decision === "follow_up";

  const actions: RowAction[] = [
    ...(live &&
    !role.closed &&
    decisions.length > 0 &&
    !(inline && r.status === "open")
      ? [
          {
            key: "arbitrate",
            label: r.status === "open" ? t.arbitrate : t.rearbitrate,
            icon: IconPenWriting2,
            onSelect: () => setDialog("arbitrate"),
          },
        ]
      : []),
    ...(liftable && !inline
      ? [
          {
            key: "lift",
            label: t.lift,
            icon: IconCheck,
            onSelect: () => setDialog("lift"),
          },
        ]
      : []),
    ...(followUp && (role.owner || role.follower)
      ? [
          {
            key: "note",
            label: t.note,
            icon: IconPenWriting2,
            onSelect: () => setDialog("note"),
          },
        ]
      : []),
    ...(followUp && role.owner && !r.taskId
      ? [
          {
            key: "task",
            label: t.createTask,
            icon: IconPlus,
            onSelect: () => setDialog("task"),
          },
        ]
      : []),
    ...(liftable && role.owner
      ? [
          {
            key: "link",
            label: t.linkTask,
            icon: IconLink,
            onSelect: () => setDialog("link"),
          },
        ]
      : []),
  ];

  if (actions.length === 0) return null;
  return (
    <>
      <RowActions label={t.menu(r.description)} actions={actions} />
      <FormDialog
        open={dialog === "arbitrate"}
        onOpenChange={(open) => !open && close()}
        title={t.arbitrateTitle}
        description={t.arbitrateBody}
        closeLabel={fr.dialogs.close}
      >
        <ArbitrateForm
          projectId={projectId}
          reserveId={r.id}
          decisions={decisions}
          current={{
            decision: r.decision,
            reason: r.reason,
            personId: r.followUp.personId,
            dueOn: r.followUp.dueOn,
            channel: r.followUp.channel,
          }}
          members={members}
          others={others}
          onDone={close}
        />
      </FormDialog>
      <FormDialog
        open={dialog === "lift"}
        onOpenChange={(open) => !open && close()}
        title={t.liftTitle}
        description={t.liftBody}
        closeLabel={fr.dialogs.close}
      >
        <TextForm
          id={`lift-${r.id}`}
          label={t.liftNote}
          maxLength={1000}
          submitLabel={t.lift}
          done={t.lifted}
          onDone={close}
          run={(note) => liftReserve({ projectId, reserveId: r.id, note })}
        />
      </FormDialog>
      <FormDialog
        open={dialog === "note"}
        onOpenChange={(open) => !open && close()}
        title={t.noteTitle}
        description={r.description}
        closeLabel={fr.dialogs.close}
      >
        <TextForm
          id={`note-${r.id}`}
          label={t.noteTitle}
          maxLength={2000}
          defaultValue={r.followUp.note ?? ""}
          submitLabel={t.note}
          done={t.noteSaved}
          onDone={close}
          run={(note) => noteReserve({ projectId, reserveId: r.id, note })}
        />
      </FormDialog>
      <FormDialog
        open={dialog === "link"}
        onOpenChange={(open) => !open && close()}
        title={t.linkTaskTitle}
        description={r.description}
        closeLabel={fr.dialogs.close}
      >
        <LinkTaskForm
          reserveId={r.id}
          tasks={tasks}
          current={r.taskId}
          onDone={close}
          run={(taskId) =>
            linkReserveTask({ projectId, reserveId: r.id, taskId })
          }
        />
      </FormDialog>
      <ConfirmDialog
        open={dialog === "task"}
        onOpenChange={(open) => !open && close()}
        title={t.createTaskTitle}
        description={t.createTaskBody}
        cancelLabel={fr.dialogs.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={t.createTask}
        pendingLabel={t.creating}
        pending={pending}
        error={error}
        onConfirm={() =>
          startTransition(async () => {
            const result = await createReserveTask({
              projectId,
              reserveId: r.id,
            });
            if (!result.ok) return setError(result.error);
            toast.success(t.taskCreated);
            close();
          })
        }
      />
    </>
  );
}

function TextForm({
  id,
  label,
  maxLength,
  defaultValue = "",
  submitLabel,
  done,
  onDone,
  run,
}: {
  id: string;
  label: string;
  maxLength: number;
  defaultValue?: string;
  submitLabel: string;
  done: string;
  onDone: () => void;
  run: (text: string) => Promise<WriteResult>;
}) {
  const submit = useWriteSubmit(onDone, done);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const text = String(
          new FormData(event.currentTarget).get("text") ?? "",
        );
        submit.run(() => run(text));
      }}
    >
      <TextareaField
        id={id}
        name="text"
        label={label}
        rows={3}
        maxLength={maxLength}
        defaultValue={defaultValue}
      />
      <FormMessage kind="error">{submit.error}</FormMessage>
      <DialogFormActions
        pending={submit.pending}
        submitLabel={submitLabel}
        onCancel={onDone}
      />
    </form>
  );
}

function LinkTaskForm({
  reserveId,
  tasks,
  current,
  onDone,
  run,
}: {
  reserveId: string;
  tasks: { id: string; title: string }[];
  current: string | null;
  onDone: () => void;
  run: (taskId: string) => Promise<WriteResult>;
}) {
  const submit = useWriteSubmit(onDone, t.taskLinked);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const value = String(
          new FormData(event.currentTarget).get("task") ?? "",
        );
        submit.run(() => run(value === NONE ? "" : value));
      }}
    >
      <OptionSelect
        id={`link-${reserveId}`}
        name="task"
        label={t.task}
        items={{
          [NONE]: t.noTask,
          ...Object.fromEntries(tasks.map((task) => [task.id, task.title])),
        }}
        defaultValue={current ?? NONE}
      />
      <FormMessage kind="error">{submit.error}</FormMessage>
      <DialogFormActions
        pending={submit.pending}
        submitLabel={t.linkTask}
        onCancel={onDone}
      />
    </form>
  );
}

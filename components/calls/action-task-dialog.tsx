"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogButton } from "@/components/ui/dialog-button";
import { MarkedText } from "@/components/ui/marked-text";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import type { CallAction } from "@/lib/calls/outcomes";
import { createTask } from "@/lib/framing/actions/points-tasks";
import { callPage } from "@/lib/i18n/fr/calls-page";
import { parisPlace } from "@/lib/utils/calendar-period";

const fr = { callPage };

type Target = {
  members: { personId: string; name: string }[];
  // The person named in the call when it clearly is a member; else nobody.
  defaultAssigneeId: string;
  // The call's project; or (internal meeting) the projects to choose from.
  projectId: string | null;
  projects: { id: string; title: string }[];
  // The deliverable a creative exchange is about: its task points to it.
  deliverableId: string | null;
};

/**
 * « Créer la tâche » of one action of a call: a window where a person picks
 * its owner and its due date, both required — never PO (CLAUDE.md rule 6).
 * An internal meeting's task also asks which project it goes to.
 */
export function ActionTaskButton({
  action,
  ...target
}: Target & { action: CallAction }) {
  const t = fr.callPage.task;
  return (
    <DialogButton label={t.action} title={t.title} description={t.description}>
      {(close) => <TaskForm action={action} target={target} onDone={close} />}
    </DialogButton>
  );
}

function TaskForm({
  action,
  target,
  onDone,
}: {
  action: CallAction;
  target: Target;
  onDone: () => void;
}) {
  const t = fr.callPage.task;
  const router = useRouter();
  const { pending, run, error } = useFramingAction({ inline: true });
  const [project, setProject] = useState(
    target.projectId ?? target.projects[0]?.id ?? "",
  );
  const [assignee, setAssignee] = useState(target.defaultAssigneeId);
  const [due, setDue] = useState("");
  const [tried, setTried] = useState(false);
  const today = parisPlace(new Date()).day;
  const errors: Partial<Record<"project" | "assignee" | "due", string>> = {
    project: project ? undefined : t.projectMissing,
    assignee: assignee ? undefined : t.assigneeMissing,
    due: !due ? t.dueMissing : due < today ? t.duePast : undefined,
  };
  const shown: typeof errors = tried ? errors : {};

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        const first = errors.project
          ? "project-select"
          : errors.assignee
            ? "assignee-select"
            : errors.due
              ? "due"
              : null;
        if (first) return document.getElementById(first)?.focus();
        run(
          () =>
            createTask(project, {
              title: action.what,
              assigneePersonId: assignee,
              dueDate: due,
              sourceReportItemId: action.id,
              deliverableId: target.deliverableId,
            }),
          () => {
            toast.success(t.created);
            onDone();
            router.refresh();
          },
        );
      }}
    >
      <div className="flex flex-col gap-1">
        <p className="text-body-md font-semibold">
          <MarkedText text={action.what} />
        </p>
        {action.quote && (
          <p className="text-caption text-[color:var(--text-secondary)]">
            {t.why(action.quote)}
          </p>
        )}
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {!target.projectId && (
        <OptionSelect
          name="project"
          label={t.project}
          required
          items={Object.fromEntries(
            target.projects.map((p) => [p.id, p.title]),
          )}
          defaultValue={project || null}
          onValueChange={setProject}
          error={shown.project}
        />
      )}
      <OptionSelect
        name="assignee"
        label={t.assignee}
        required
        placeholder={t.assigneePlaceholder}
        items={Object.fromEntries(
          target.members.map((m) => [m.personId, m.name]),
        )}
        defaultValue={assignee || null}
        onValueChange={setAssignee}
        error={shown.assignee}
      />
      <Field
        name="due"
        type="date"
        label={t.due}
        aria-required
        min={today}
        value={due}
        onChange={(event) => setDue(event.target.value)}
        error={shown.due}
      />
      <DialogFormActions
        onCancel={onDone}
        submitLabel={t.action}
        pending={pending}
      />
    </form>
  );
}

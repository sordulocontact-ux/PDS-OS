"use client";

import { useEffect, useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/framing/option-select";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { toast } from "@/components/ui/toast";
import { work } from "@/lib/i18n/fr/work";
import {
  addPersonalTask,
  updatePersonalTask,
} from "@/lib/work/personal-task-actions";
import { loadProjectSwitcher } from "@/lib/projects/switcher-actions";
import { quadrantOf, type PersonalTask } from "@/lib/work/personal-tasks";
import {
  isTaskPage,
  suggestTaskPage,
  TASK_PAGES,
  type TaskPage,
} from "@/lib/work/task-pages";

import { QuadrantBadge } from "./quadrant-badge";

const fr = { work };

export type TaskEdit = Pick<
  PersonalTask,
  "title" | "dueDate" | "important" | "projectId" | "projectTitle" | "page"
>;

const NONE = "none";

type Importance = "important" | "secondary";

/**
 * A task of « Mes tâches » in its modal: « Ajouter une tâche » (no `task`)
 * or « Modifier » of its « ⋯ ». Its wording, its due date (or none), its
 * importance, the project and the page of it the task opens (retour du
 * 09/11/2026; the page follows the wording until the person picks one:
 * « Valider le budget… » → Budget); below, the box of the matrix it goes to,
 * the urgency coming from the date.
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
  const [projectId, setProjectId] = useState(task?.projectId ?? NONE);
  // Picked by the person; until then, the page the wording names.
  const [pickedPage, setPickedPage] = useState<TaskPage | null>(
    task?.page ?? null,
  );
  // The launched projects the person sees, read when the modal opens.
  const [projects, setProjects] = useState<Record<string, string> | null>(null);
  const [tried, setTried] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let live = true;
    loadProjectSwitcher()
      .then((list) => {
        if (!live) return;
        const launched = list.filter((p) => p.launched);
        setProjects(Object.fromEntries(launched.map((p) => [p.id, p.title])));
      })
      .catch(() => live && setProjects({}));
    return () => {
      live = false;
    };
  }, []);

  const missing = !title.trim();
  const project = projectId === NONE ? null : projectId;
  const page = project
    ? (pickedPage ?? suggestTaskPage(title) ?? "overview")
    : null;
  const next: TaskEdit = {
    title: title.trim(),
    dueDate: due || null,
    important: importance === "important",
    projectId: project,
    projectTitle: project
      ? (projects?.[project] ?? task?.projectTitle ?? null)
      : null,
    page,
  };
  // The task's own project, kept in the list while the others load (or
  // when it is no longer launched).
  const projectOptions = {
    [NONE]: t.noProject,
    ...(task?.projectId && task.projectTitle
      ? { [task.projectId]: task.projectTitle }
      : {}),
    ...projects,
  };
  const box = quadrantOf(
    {
      id: task?.id ?? "",
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
          const input = {
            title: next.title,
            dueDate: next.dueDate,
            important: next.important,
            projectId: next.projectId,
            page: next.page,
          };
          const res = task
            ? await updatePersonalTask(task.id, input)
            : await addPersonalTask(input);
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="task-project">{t.project}</Label>
        <SearchSelect
          id="task-project"
          label={t.project}
          options={projectOptions}
          value={projectId}
          onChange={setProjectId}
          searchPlaceholder={t.projectSearch}
          emptyLabel={t.projectNone}
          disabled={projects === null && !task?.projectId}
          fill
        />
      </div>
      {project && page && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-page">{t.page}</Label>
          <OptionSelect
            id="task-page"
            label={t.page}
            options={Object.fromEntries(
              TASK_PAGES.map((key) => [key, fr.work.tasks.pages[key]]),
            )}
            value={page}
            onChange={(value) => isTaskPage(value) && setPickedPage(value)}
            fill
          />
          <p className="text-caption text-[color:var(--text-secondary)]">
            {pickedPage ? t.pageHint : t.pageSuggested}
          </p>
        </div>
      )}
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

"use client";

import { IconClipboardCheck } from "nucleo-sharp-essential";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Fold } from "@/components/ui/fold";
import { Input } from "@/components/ui/input";
import { Rows } from "@/components/ui/rows";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toast";
import { work } from "@/lib/i18n/fr/work";
import {
  addPersonalTask,
  setPersonalTaskBox,
  setPersonalTaskDone,
} from "@/lib/work/personal-task-actions";
import {
  BOX_FLAGS,
  byDoneAt,
  byDue,
  quadrantOf,
  urgentByDate,
  type PersonalTask,
  type Quadrant,
} from "@/lib/work/personal-tasks";

import { QuadrantBadge, TaskRow } from "./my-task-row";
import { MyTasksMatrix } from "./my-tasks-matrix";

const fr = { work };

const TASKS_VIEWS = ["list", "matrix"] as const;
type TasksView = (typeof TASKS_VIEWS)[number];
// In the URL beside ?section=taches, in French as the page's other params.
const VIEW_PARAM = "affichage";
const MATRIX_VALUE = "matrice";

/**
 * « Mes tâches »: a field to write a task (its date, its importance and
 * urgency, if any), then the tasks still to do, as a list by due date or as
 * the Eisenhower matrix, each ticked in place and moved to another box; the
 * latest done folded below, to undo a tick.
 */
export function MyTasks({
  todo,
  done,
  today,
}: {
  todo: PersonalTask[];
  done: PersonalTask[];
  today: string;
}) {
  const t = fr.work.tasks;
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<TasksView>(
    params.get(VIEW_PARAM) === MATRIX_VALUE ? "matrix" : "list",
  );
  // Changes shown at once, before the server answers (a tick, a move).
  const [changed, setChanged] = useState<Record<string, Partial<PersonalTask>>>(
    {},
  );

  const all = [...todo, ...done].map((task) =>
    task.id in changed ? { ...task, ...changed[task.id] } : task,
  );
  const open = all.filter((task) => !task.done).sort(byDue);
  const closed = all.filter((task) => task.done).sort(byDoneAt);

  const change = (
    task: PersonalTask,
    next: Partial<PersonalTask>,
    write: () => Promise<{ ok: boolean }>,
  ) => {
    const before = changed[task.id];
    setChanged((prev) => ({
      ...prev,
      [task.id]: { ...prev[task.id], ...next },
    }));
    startTransition(async () => {
      const res = await write();
      if (!res.ok) {
        toast.error(t.failed);
        setChanged((prev) => {
          const rest = { ...prev };
          if (before) rest[task.id] = before;
          else delete rest[task.id];
          return rest;
        });
        return;
      }
      router.refresh();
    });
  };

  const toggle = (task: PersonalTask, isDone: boolean) =>
    change(
      task,
      {
        done: isDone,
        doneAt: isDone ? (task.doneAt ?? new Date().toISOString()) : null,
      },
      () => setPersonalTaskDone(task.id, isDone),
    );

  const move = (task: PersonalTask, to: Quadrant) => {
    const flags = BOX_FLAGS[to];
    // A near due date keeps it urgent: said, not moved.
    if (!flags.urgent && urgentByDate(task, today)) {
      toast.info(t.move.staysUrgent);
      return;
    }
    change(task, flags, () => setPersonalTaskBox(task.id, flags));
  };

  const pick = (next: TasksView | null) => {
    if (!next) return;
    setView(next);
    const url = new URLSearchParams(params.toString());
    if (next === "matrix") url.set(VIEW_PARAM, MATRIX_VALUE);
    else url.delete(VIEW_PARAM);
    window.history.replaceState(null, "", `${pathname}?${url.toString()}`);
  };

  return (
    <div className="flex flex-col gap-5">
      <AddTask today={today} onAdded={() => router.refresh()} />

      {open.length === 0 && closed.length === 0 ? (
        <EmptyState
          icon={IconClipboardCheck}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <>
          <SegmentedControl
            aria-label={t.views.label}
            className="self-start"
            options={TASKS_VIEWS.map((key) => ({
              value: key,
              label: t.views[key],
            }))}
            value={view}
            onChange={pick}
          />
          {view === "matrix" ? (
            <MyTasksMatrix
              tasks={open}
              today={today}
              onToggle={toggle}
              onMove={move}
            />
          ) : open.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.allDone}</p>
          ) : (
            <Rows label={fr.work.tabs.tasks}>
              {open.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onToggle={toggle}
                  onMove={move}
                />
              ))}
            </Rows>
          )}
        </>
      )}

      {closed.length > 0 && (
        <Fold summary={t.done(closed.length)}>
          <Rows>
            {closed.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                onToggle={toggle}
              />
            ))}
          </Rows>
        </Fold>
      )}
    </div>
  );
}

function AddTask({ today, onAdded }: { today: string; onAdded: () => void }) {
  const t = fr.work.tasks.add;
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [important, setImportant] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      noValidate
      aria-label={t.title}
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) {
          setError(t.titleMissing);
          document.getElementById("new-task-title")?.focus();
          return;
        }
        startTransition(async () => {
          const res = await addPersonalTask({
            title,
            dueDate: due || null,
            important,
            urgent,
          });
          if (!res.ok) {
            toast.error(fr.work.tasks.failed);
            return;
          }
          setTitle("");
          setDue("");
          setImportant(false);
          setUrgent(false);
          setError(null);
          onAdded();
          document.getElementById("new-task-title")?.focus();
        });
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Input
            id="new-task-title"
            name="title"
            aria-label={t.title}
            placeholder={t.titlePlaceholder}
            maxLength={300}
            autoComplete="off"
            value={title}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setTitle(event.target.value);
              if (error) setError(null);
            }}
          />
          {error && <p className="text-xs text-error">{error}</p>}
        </div>
        <Input
          type="date"
          name="due"
          aria-label={t.due}
          placeholder={t.due}
          className="sm:w-44"
          value={due}
          onChange={(event) => setDue(event.target.value)}
        />
        <Button type="submit" disabled={pending}>
          {t.submit}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <CheckboxField
          label={t.important}
          checked={important}
          onChange={setImportant}
        />
        <CheckboxField label={t.urgent} checked={urgent} onChange={setUrgent} />
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {t.goesTo}
          <QuadrantBadge
            quadrant={quadrantOf(
              {
                id: "",
                title,
                dueDate: due || null,
                important,
                urgent,
                projectId: null,
                done: false,
                doneAt: null,
              },
              today,
            )}
          />
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{t.urgentHint}</p>
    </form>
  );
}

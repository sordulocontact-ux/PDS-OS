"use client";

import { IconClipboardCheck } from "nucleo-sharp-essential";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { EmptyState } from "@/components/shell/empty-state";
import { Fold } from "@/components/ui/fold";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toast";
import { work } from "@/lib/i18n/fr/work";
import {
  setPersonalTaskBox,
  setPersonalTaskDone,
} from "@/lib/work/personal-task-actions";
import {
  BOX_FLAGS,
  byDoneAt,
  byDue,
  urgentByDate,
  type PersonalTask,
  type Quadrant,
} from "@/lib/work/personal-tasks";

import type { TaskEdit } from "./my-task-form";
import { TaskList, TaskRow } from "./my-task-row";
import { MyTasksMatrix } from "./my-tasks-matrix";

const fr = { work };

// The matrix first, the list second (retour du 09/11/2026).
const TASKS_VIEWS = ["matrix", "list"] as const;
type TasksView = (typeof TASKS_VIEWS)[number];
// In the URL beside ?section=taches, in French as the page's other params;
// only the list is said, the matrix being the default.
const VIEW_PARAM = "affichage";
const LIST_VALUE = "liste";

/**
 * « Mes tâches »: the tasks still to do, as the Eisenhower matrix (first)
 * or as a list by due date, each ticked in place and moved to another box;
 * the latest done folded below, to undo a tick. Most are put in by PO from
 * the meetings; « Ajouter une tâche » sits at the head of the page.
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
    params.get(VIEW_PARAM) === LIST_VALUE ? "list" : "matrix",
  );
  // Changes shown at once, before the server answers (a tick, a move).
  const [changed, setChanged] = useState<Record<string, Partial<PersonalTask>>>(
    {},
  );

  // Deleted ones, gone at once.
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());

  const all = [...todo, ...done]
    .filter((task) => !removed.has(task.id))
    .map((task) =>
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

  // Saved by its dialog: shown at once, the server read follows.
  const edited = (task: PersonalTask, next: TaskEdit) => {
    setChanged((prev) => ({
      ...prev,
      [task.id]: { ...prev[task.id], ...next },
    }));
    router.refresh();
  };
  const remove = (task: PersonalTask) => {
    setRemoved((prev) => new Set(prev).add(task.id));
    router.refresh();
  };
  const handlers = { onMove: move, onEdited: edited, onRemoved: remove };

  const pick = (next: TasksView | null) => {
    if (!next) return;
    setView(next);
    const url = new URLSearchParams(params.toString());
    if (next === "list") url.set(VIEW_PARAM, LIST_VALUE);
    else url.delete(VIEW_PARAM);
    window.history.replaceState(null, "", `${pathname}?${url.toString()}`);
  };

  return (
    <div className="flex flex-col gap-5">
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
              {...handlers}
            />
          ) : (
            <TaskList
              label={fr.work.tabs.tasks}
              empty={open.length === 0 ? t.allDone : undefined}
            >
              {open.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onToggle={toggle}
                  {...handlers}
                />
              ))}
            </TaskList>
          )}
        </>
      )}

      {closed.length > 0 && (
        <Fold summary={t.done(closed.length)}>
          <TaskList label={t.done(closed.length)}>
            {closed.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                onToggle={toggle}
                {...handlers}
              />
            ))}
          </TaskList>
        </Fold>
      )}
    </div>
  );
}

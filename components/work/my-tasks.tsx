"use client";

import { IconClipboardCheck } from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { Fold } from "@/components/ui/fold";
import { Input } from "@/components/ui/input";
import { Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { work } from "@/lib/i18n/fr/work";
import { isOverdue } from "@/lib/insights/dates";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";
import {
  addPersonalTask,
  setPersonalTaskDone,
} from "@/lib/work/personal-task-actions";
import type { Tone as StatusTone } from "@/lib/ui/state-tones";
import {
  byDoneAt,
  byDue,
  quadrantOf,
  type PersonalTask,
  type Quadrant,
} from "@/lib/work/personal-tasks";

const fr = { work };

/**
 * « Mes tâches »: a field to write a task (and its date, if any), then the
 * tasks still to do, the nearest due date first, each ticked in place; the
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
  const [, startTransition] = useTransition();
  // Ticks shown at once, before the server answers.
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  const all = [...todo, ...done].map((task) =>
    task.id in ticked
      ? {
          ...task,
          done: ticked[task.id],
          doneAt: ticked[task.id]
            ? (task.doneAt ?? new Date().toISOString())
            : null,
        }
      : task,
  );
  const open = all.filter((task) => !task.done).sort(byDue);
  const closed = all.filter((task) => task.done).sort(byDoneAt);

  const toggle = (task: PersonalTask, next: boolean) => {
    setTicked((prev) => ({ ...prev, [task.id]: next }));
    startTransition(async () => {
      const res = await setPersonalTaskDone(task.id, next);
      if (!res.ok) {
        toast.error(t.failed);
        setTicked((prev) => {
          const rest = { ...prev };
          delete rest[task.id];
          return rest;
        });
        return;
      }
      router.refresh();
    });
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
            />
          ))}
        </Rows>
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

function TaskRow({
  task,
  today,
  onToggle,
}: {
  task: PersonalTask;
  today: string;
  onToggle: (task: PersonalTask, next: boolean) => void;
}) {
  const t = fr.work.tasks;
  const late = !task.done && task.dueDate && isOverdue(task.dueDate, today);
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Checkbox
        size="md"
        checked={task.done}
        onChange={(event) => onToggle(task, event.currentTarget.checked)}
        aria-label={task.done ? t.untoggle(task.title) : t.toggle(task.title)}
      />
      <span
        className={cn(
          "min-w-0 flex-1 text-sm break-words",
          task.done && "text-muted-foreground line-through",
        )}
      >
        {task.title}
      </span>
      {!task.done && <QuadrantBadge quadrant={quadrantOf(task, today)} />}
      <span
        className={cn(
          "w-28 shrink-0 text-right text-xs tabular-nums",
          late ? "text-error" : "text-muted-foreground",
        )}
      >
        {task.dueDate
          ? [late && t.overdue, formatShortDay(task.dueDate, { bare: true })]
              .filter(Boolean)
              .join(" · ")
          : t.noDue}
      </span>
    </li>
  );
}

const quadrantTone: Record<Quadrant, StatusTone> = {
  do: "danger",
  plan: "info",
  delegate: "warning",
  later: "neutral",
};

/** Its box of the matrix, with what the box means on hover. */
function QuadrantBadge({ quadrant }: { quadrant: Quadrant }) {
  const t = fr.work.tasks;
  return (
    <span title={t.quadrantHelp[quadrant]} className="shrink-0">
      <StatusBadge tone={quadrantTone[quadrant]} size="sm">
        {t.quadrants[quadrant]}
      </StatusBadge>
    </span>
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

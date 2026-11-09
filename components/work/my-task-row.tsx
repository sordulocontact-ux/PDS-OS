"use client";

import { IconArrowUpRight } from "@/components/icons";
import { Checkbox } from "@/components/ui/checkbox";
import { MarkedText } from "@/components/ui/marked-text";
import { RecordMenu } from "@/components/ui/record-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { work } from "@/lib/i18n/fr/work";
import { isOverdue } from "@/lib/insights/dates";
import type { Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";
import { withoutMarkdownMarks } from "@/lib/utils/markdown-marks";
import { deletePersonalTask } from "@/lib/work/personal-task-actions";
import {
  QUADRANTS,
  quadrantOf,
  type PersonalTask,
  type Quadrant,
} from "@/lib/work/personal-tasks";

import { TaskEditForm, type TaskEdit } from "./my-task-edit";

const fr = { work };

export const quadrantTone: Record<Quadrant, Tone> = {
  do: "danger",
  plan: "info",
  delegate: "warning",
  later: "neutral",
};

/** Its box of the matrix, with what the box means on hover. */
export function QuadrantBadge({ quadrant }: { quadrant: Quadrant }) {
  const t = fr.work.tasks;
  return (
    <span title={t.quadrantHelp[quadrant]} className="shrink-0">
      <StatusBadge tone={quadrantTone[quadrant]} size="sm">
        {t.quadrants[quadrant]}
      </StatusBadge>
    </span>
  );
}

/**
 * One task of « Mes tâches »: ticked in place, its box (in the list; the
 * matrix's box already says it), its due date, red when past. With the
 * handlers, its « ⋯ »: to another box (also dragged with the mouse),
 * « Modifier », « Supprimer ».
 */
export function TaskRow({
  task,
  today,
  onToggle,
  onMove,
  onEdited,
  onRemoved,
  showBox = true,
}: {
  task: PersonalTask;
  today: string;
  onToggle: (task: PersonalTask, next: boolean) => void;
  onMove?: (task: PersonalTask, to: Quadrant) => void;
  onEdited?: (task: PersonalTask, next: TaskEdit) => void;
  onRemoved?: (task: PersonalTask) => void;
  showBox?: boolean;
}) {
  const t = fr.work.tasks;
  const plainTitle = withoutMarkdownMarks(task.title);
  const late = !task.done && task.dueDate && isOverdue(task.dueDate, today);
  const box = quadrantOf(task, today);
  const draggable = Boolean(onMove) && !task.done;
  return (
    <li
      draggable={draggable || undefined}
      onDragStart={
        draggable
          ? (event) => {
              event.dataTransfer.setData("text/plain", task.id);
              event.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      className={cn(
        "group/row flex items-center gap-3 px-4 py-3",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <Checkbox
        size="md"
        checked={task.done}
        onChange={(event) => onToggle(task, event.currentTarget.checked)}
        aria-label={task.done ? t.untoggle(plainTitle) : t.toggle(plainTitle)}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-sm break-words",
            task.done && "text-muted-foreground line-through",
          )}
        >
          <MarkedText text={task.title} />
        </span>
        {task.source && (
          <ViewLink
            href={routes.call(task.source.callId)}
            draggable={false}
            className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {t.fromCall(task.source.callTitle)}
          </ViewLink>
        )}
      </span>
      {showBox && !task.done && <QuadrantBadge quadrant={box} />}
      <span
        className={cn(
          "shrink-0 text-right text-xs tabular-nums",
          showBox && "w-28",
          late ? "text-error" : "text-muted-foreground",
        )}
      >
        {task.dueDate
          ? [late && t.overdue, formatShortDay(task.dueDate, { bare: true })]
              .filter(Boolean)
              .join(" · ")
          : t.noDue}
      </span>
      {onMove && onEdited && onRemoved && (
        <RecordMenu
          label={plainTitle}
          extra={
            task.done
              ? []
              : QUADRANTS.filter((to) => to !== box).map((to) => ({
                  key: to,
                  label: t.move.to(t.quadrants[to]),
                  icon: IconArrowUpRight,
                  onSelect: () => onMove(task, to),
                }))
          }
          edit={{
            title: t.edit.title,
            description: t.edit.description,
            form: (close) => (
              <TaskEditForm
                task={task}
                onDone={close}
                onSaved={(next) => onEdited(task, next)}
              />
            ),
          }}
          remove={{
            title: t.remove.title,
            body: t.remove.body(plainTitle),
            done: t.remove.done,
            run: async () => {
              const res = await deletePersonalTask(task.id);
              if (!res.ok) return { ok: false, error: t.failed };
              onRemoved(task);
              return { ok: true };
            },
          }}
        />
      )}
    </li>
  );
}

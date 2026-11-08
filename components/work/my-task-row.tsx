"use client";

import { IconArrowUpRight } from "@/components/icons";
import { Checkbox } from "@/components/ui/checkbox";
import { RowActions } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { work } from "@/lib/i18n/fr/work";
import { isOverdue } from "@/lib/insights/dates";
import type { Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";
import {
  QUADRANTS,
  quadrantOf,
  type PersonalTask,
  type Quadrant,
} from "@/lib/work/personal-tasks";

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
 * matrix's box already says it), its due date, red when past. `onMove`: the
 * « ⋯ » to send it to another box, and dragged with the mouse.
 */
export function TaskRow({
  task,
  today,
  onToggle,
  onMove,
  showBox = true,
}: {
  task: PersonalTask;
  today: string;
  onToggle: (task: PersonalTask, next: boolean) => void;
  onMove?: (task: PersonalTask, to: Quadrant) => void;
  showBox?: boolean;
}) {
  const t = fr.work.tasks;
  const late = !task.done && task.dueDate && isOverdue(task.dueDate, today);
  const box = quadrantOf(task, today);
  return (
    <li
      draggable={onMove ? true : undefined}
      onDragStart={
        onMove
          ? (event) => {
              event.dataTransfer.setData("text/plain", task.id);
              event.dataTransfer.effectAllowed = "move";
            }
          : undefined
      }
      className={cn(
        "group/row flex items-center gap-3 px-4 py-3",
        onMove && "cursor-grab active:cursor-grabbing",
      )}
    >
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
      {onMove && !task.done && (
        <RowActions
          label={t.move.label(task.title)}
          reveal
          actions={QUADRANTS.filter((to) => to !== box).map((to) => ({
            key: to,
            label: t.move.to(t.quadrants[to]),
            icon: IconArrowUpRight,
            onSelect: () => onMove(task, to),
          }))}
        />
      )}
    </li>
  );
}

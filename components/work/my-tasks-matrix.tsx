"use client";

import { useState } from "react";

import { work } from "@/lib/i18n/fr/work";
import { cn } from "@/lib/utils";
import {
  QUADRANTS,
  quadrantOf,
  type PersonalTask,
  type Quadrant,
} from "@/lib/work/personal-tasks";

import type { TaskEdit } from "./my-task-form";
import { TaskList, TaskRow } from "./my-task-row";

const fr = { work };

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]";

/**
 * The Eisenhower matrix of « Mes tâches » (« comme l'app Matrix »), the
 * first view of the tab (retour du 09/11/2026): four boxes, urgent and
 * important at the top left. Each box is a list of the home (docs/DESIGN.md
 * § 4, « Accueil »): its name and count in grey above, what it means below
 * them, then its tasks by due date in one frame, hairlines between the rows.
 * A task goes to another box by its « ⋯ » or dragged onto it.
 */
export function MyTasksMatrix({
  tasks,
  today,
  onToggle,
  onMove,
  onEdited,
  onRemoved,
}: {
  tasks: PersonalTask[];
  today: string;
  onToggle: (task: PersonalTask, next: boolean) => void;
  onMove: (task: PersonalTask, to: Quadrant) => void;
  onEdited: (task: PersonalTask, next: TaskEdit) => void;
  onRemoved: (task: PersonalTask) => void;
}) {
  const t = fr.work.tasks;
  // The box a task is dragged over, outlined.
  const [over, setOver] = useState<Quadrant | null>(null);

  return (
    <div className="grid gap-x-4 gap-y-8 md:grid-cols-2">
      {QUADRANTS.map((box) => {
        const own = tasks.filter((task) => quadrantOf(task, today) === box);
        return (
          <section
            key={box}
            aria-label={t.quadrants[box]}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              if (over !== box) setOver(box);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node))
                setOver(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setOver(null);
              const task = tasks.find(
                (item) => item.id === event.dataTransfer.getData("text/plain"),
              );
              if (task && quadrantOf(task, today) !== box) onMove(task, box);
            }}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-col gap-0.5 px-1">
              <h2
                className={cn(
                  caption,
                  "font-semibold text-[color:var(--text-secondary)]",
                )}
              >
                {t.quadrants[box]}
                {own.length > 0 && (
                  <span className="ml-1.5 font-medium text-[color:var(--text-tertiary)] tabular-nums">
                    {own.length}
                  </span>
                )}
              </h2>
              <p className={cn(caption, "text-[color:var(--text-tertiary)]")}>
                {t.quadrantHelp[box]}
              </p>
            </div>
            <TaskList
              label={t.quadrants[box]}
              highlighted={over === box}
              empty={own.length === 0 ? t.boxEmpty : undefined}
            >
              {own.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onToggle={onToggle}
                  onMove={onMove}
                  onEdited={onEdited}
                  onRemoved={onRemoved}
                  showBox={false}
                />
              ))}
            </TaskList>
          </section>
        );
      })}
    </div>
  );
}

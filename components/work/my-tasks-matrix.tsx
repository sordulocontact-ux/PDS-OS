"use client";

import { useState } from "react";

import { Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { work } from "@/lib/i18n/fr/work";
import { cn } from "@/lib/utils";
import {
  QUADRANTS,
  quadrantOf,
  type PersonalTask,
  type Quadrant,
} from "@/lib/work/personal-tasks";

import { quadrantTone, TaskRow } from "./my-task-row";

const fr = { work };

/**
 * The Eisenhower matrix of « Mes tâches » (« comme l'app Matrix »): four
 * boxes, urgent and important at the top left, each with what it means and
 * its tasks by due date. A task goes to another box by its « ⋯ » or dragged
 * onto it.
 */
export function MyTasksMatrix({
  tasks,
  today,
  onToggle,
  onMove,
}: {
  tasks: PersonalTask[];
  today: string;
  onToggle: (task: PersonalTask, next: boolean) => void;
  onMove: (task: PersonalTask, to: Quadrant) => void;
}) {
  const t = fr.work.tasks;
  // The box a task is dragged over, outlined.
  const [over, setOver] = useState<Quadrant | null>(null);

  return (
    <div className="grid gap-3 md:grid-cols-2">
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
            className={cn(
              "flex min-h-40 flex-col gap-3 rounded-xl border border-[color:var(--border-hairline)] p-4 transition-colors duration-[var(--duration-fast)]",
              over === box &&
                "border-[color:var(--border-strong)] bg-[var(--control-bg-hover)]",
            )}
          >
            <header className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={quadrantTone[box]} size="sm">
                    {t.quadrants[box]}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {own.length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t.quadrantHelp[box]}
                </p>
              </div>
            </header>
            {own.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.boxEmpty}</p>
            ) : (
              <Rows label={t.quadrants[box]}>
                {own.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    onToggle={onToggle}
                    onMove={onMove}
                    showBox={false}
                  />
                ))}
              </Rows>
            )}
          </section>
        );
      })}
    </div>
  );
}

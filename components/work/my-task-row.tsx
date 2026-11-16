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
import { overdueTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";
import { withoutMarkdownMarks } from "@/lib/utils/markdown-marks";
import { deletePersonalTask } from "@/lib/work/personal-task-actions";
import { taskHref } from "@/lib/work/task-pages";
import {
  QUADRANTS,
  quadrantOf,
  type PersonalTask,
  type Quadrant,
} from "@/lib/work/personal-tasks";

import { TaskForm, type TaskEdit } from "./my-task-form";
import { QuadrantBadge } from "./quadrant-badge";

const fr = { work };

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]";

/**
 * Tasks of « Mes tâches » in one frame, as the home's lists: border, card
 * background, radius 12, hairlines between the rows. `flush`: without its
 * own frame, inside one (a box of the matrix: no frame in a frame).
 * `empty`: said inside the frame.
 */
export function TaskList({
  label,
  flush = false,
  empty,
  children,
}: {
  label: string;
  flush?: boolean;
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        "flex flex-col [&>li+li]:border-t [&>li+li]:border-[color:var(--border-hairline)]",
        !flush &&
          "overflow-hidden rounded-xl border border-[color:var(--border-default)] bg-card",
      )}
    >
      {empty ? (
        <li
          className={cn(
            caption,
            "px-4 py-3.5 text-[color:var(--text-tertiary)] modern:py-3",
          )}
        >
          {empty}
        </li>
      ) : (
        children
      )}
    </ul>
  );
}

/**
 * One task of « Mes tâches », laid out as a row of the home's lists: ticked
 * in place, its wording (16 px medium) a link to the page it is about when
 * it has a project, below its due date, that page (« Minuit pile › Budget »)
 * and the meeting it comes from; on the right « En retard » and its box (in the list; the
 * matrix's box already says it). With the handlers, its « ⋯ »: to another
 * box (also dragged with the mouse), « Modifier », « Supprimer ».
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
  const late =
    !task.done && task.dueDate !== null && isOverdue(task.dueDate, today);
  const box = quadrantOf(task, today);
  const href = taskHref(task.projectId, task.page);
  const where =
    href && task.projectTitle
      ? t.leadsTo(task.projectTitle, t.pages[task.page ?? "overview"])
      : null;
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
        "flex items-start gap-3 px-4 py-3 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-[var(--control-bg-hover)]",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <span className="flex h-[var(--type-body-md-lh)] shrink-0 items-center">
        <Checkbox
          size="md"
          checked={task.done}
          onChange={(event) => onToggle(task, event.currentTarget.checked)}
          aria-label={task.done ? t.untoggle(plainTitle) : t.toggle(plainTitle)}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-medium break-words",
            task.done
              ? "text-[color:var(--text-tertiary)] line-through"
              : "text-[color:var(--text-primary)]",
          )}
        >
          {href ? (
            // The task opens the page it is about (retour du 09/11/2026).
            <ViewLink
              href={href}
              draggable={false}
              aria-label={t.open(plainTitle, where ?? "")}
              className="decoration-[color:var(--border-hover)] underline-offset-[3px] hover:underline focus-visible:underline"
            >
              <MarkedText text={task.title} />
              <IconArrowUpRight
                aria-hidden
                className="ml-1 inline size-3.5 align-[-1px] text-[color:var(--text-tertiary)]"
              />
            </ViewLink>
          ) : (
            <MarkedText text={task.title} />
          )}
        </span>
        <span
          className={cn(
            caption,
            "break-words text-[color:var(--text-secondary)]",
          )}
        >
          {task.dueDate
            ? t.due(formatShortDay(task.dueDate, { bare: true }))
            : t.noDue}
          {where && ` · ${where}`}
          {task.source && (
            <>
              {" · "}
              <ViewLink
                href={routes.call(task.source.callId)}
                draggable={false}
                className="underline decoration-[color:var(--border-hover)] underline-offset-[3px] hover:text-[color:var(--text-primary)]"
              >
                {t.fromCall(task.source.callTitle)}
              </ViewLink>
            </>
          )}
        </span>
      </span>
      {(late || (showBox && !task.done)) && (
        <span className="flex h-[var(--type-body-md-lh)] shrink-0 items-center gap-1.5">
          {late && (
            <StatusBadge tone={overdueTone} size="sm">
              {t.overdue}
            </StatusBadge>
          )}
          {showBox && !task.done && <QuadrantBadge quadrant={box} />}
        </span>
      )}
      {onMove && onEdited && onRemoved && (
        <span className="-my-1 flex shrink-0 items-center">
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
              title: t.form.editTitle,
              description: t.form.editDescription,
              form: (close) => (
                <TaskForm
                  task={task}
                  today={today}
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
        </span>
      )}
    </li>
  );
}

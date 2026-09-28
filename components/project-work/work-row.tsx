"use client";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { CardRow } from "@/components/ui/list-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDay } from "@/lib/assistant/facts";
import { setTaskDone } from "@/lib/framing/actions/points-tasks";
import { fr } from "@/lib/i18n/fr";
import type { WorkItem } from "@/lib/project-work/workload";
import { workStatusTone } from "@/lib/ui/state-tones";

const t = fr.projectWork.work;

// Secondary line: what it is, then when (or who the validation waits on).
function subOf(item: WorkItem, names: Record<string, string>): string {
  const other = item.otherPersonId ? names[item.otherPersonId] : undefined;
  const when =
    item.kind === "task" && item.doneAt
      ? t.doneOn(formatDay(item.doneAt))
      : item.dueDate
        ? t.due(formatDay(item.dueDate))
        : item.kind === "task" || item.kind === "deliverable"
          ? t.noDueDate
          : other && item.kind === "awaitValidation"
            ? t.validator(other)
            : null;
  return [t.kinds[item.kind], when].filter(Boolean).join(" · ");
}

/** One work item of a person; a task gets its "done" checkbox. */
export function WorkRow({
  item,
  projectId,
  names,
  mePersonId,
}: {
  item: WorkItem;
  projectId: string;
  names: Record<string, string>;
  mePersonId: string | null;
}) {
  const canEdit = useCanEditProject();
  const { pending, run } = useFramingAction();
  const isTask = item.kind === "task";
  // The owner, or the assignee on their own task (RLS says the same).
  const canTick = isTask && (canEdit || item.personId === mePersonId);

  return (
    <CardRow
      href={item.href}
      main={item.title}
      sub={subOf(item, names)}
      leading={
        canTick ? (
          <input
            type="checkbox"
            aria-label={t.markDone(item.title)}
            className="mt-1.5 size-4 shrink-0 accent-selection"
            checked={item.status === "done"}
            disabled={pending}
            onChange={(e) =>
              run(() => setTaskDone(projectId, item.id, e.target.checked))
            }
          />
        ) : undefined
      }
      badge={
        item.status === "done" ? undefined : (
          <StatusBadge tone={workStatusTone[item.status]} size="sm">
            {t.statuses[item.status]}
          </StatusBadge>
        )
      }
    />
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setTaskDone } from "@/lib/framing/actions/points-tasks";
import { fr } from "@/lib/i18n/fr";
import { createLegalPlanTask } from "@/lib/legal/tracking/actions";
import type { TrackedItem } from "@/lib/legal/tracking/state";

/**
 * The task an action became, from the Suivi: « Créer la tâche » once the
 * action is free and has none, « Cocher la tâche » once its sources say it
 * is done while the task is still open. Explicit clicks: nothing is written
 * behind the user's back.
 */
export function TaskControl({
  projectId,
  item,
}: {
  projectId: string;
  item: TrackedItem;
}) {
  const router = useRouter();
  const t = fr.legal.tracking.task;
  const [pending, startTransition] = useTransition();
  const finished = item.current === "done" || item.current === "obsolete";

  const run = (work: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      if (result.ok) router.refresh();
      else toast.error(result.error ?? fr.legal.tracking.errors.failed);
    });

  // Without a responsible there is nobody to assign: « Modifier » first.
  if (!item.task && item.current === "action_now" && item.responsibleId)
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => run(() => createLegalPlanTask(projectId, item.id))}
      >
        {pending ? t.creating : t.create}
      </Button>
    );
  if (item.task && !item.task.done && finished) {
    const taskId = item.task.id;
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          run(async () => {
            const result = await setTaskDone(projectId, taskId, true);
            return result.ok ? { ok: true } : { ok: false };
          })
        }
      >
        {t.tick}
      </Button>
    );
  }
  return null;
}

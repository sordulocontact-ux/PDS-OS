"use client";

import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { productionChecklist } from "@/lib/i18n/fr/production-checklist";
import { finishChecklistTask } from "@/lib/production/checklist-actions";

const fr = { productionChecklist };

const t = fr.productionChecklist;

/** « Fait » on a task of the checklist, for its holder. */
export function FinishTaskButton({
  projectId,
  actionId,
  title,
}: {
  projectId: string;
  actionId: string;
  title: string;
}) {
  const { pending, run } = useWriteSubmit(() => undefined, t.finished);
  return (
    <Button
      size="sm"
      variant="outline"
      aria-label={t.finishLabel(title)}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() => run(() => finishChecklistTask({ projectId, actionId }))}
    >
      {t.finish}
    </Button>
  );
}

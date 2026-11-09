import { StatusBadge } from "@/components/ui/status-badge";
import { work } from "@/lib/i18n/fr/work";
import { quadrantTone } from "@/lib/ui/state-tones";
import type { Quadrant } from "@/lib/work/personal-tasks";

const fr = { work };

/** A box of the matrix of « Mes tâches », with what it means on hover. */
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

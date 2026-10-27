import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import { productionNeeds } from "@/lib/i18n/fr/production-needs";
import type { ProductionAssignment } from "@/lib/production/sheet";
import { productionAvailabilityTone } from "@/lib/ui/state-tones";

import { AssignmentActions } from "./assignment-actions";

const fr = { productionNeeds };

/** A person on a position: name, the availability a person set, who set it
 * and when, the note; the « ⋯ » for the owner. */
export function AssignmentItem({
  projectId,
  assignment,
  needLabel,
  canOrganize,
}: {
  projectId: string;
  assignment: ProductionAssignment;
  needLabel: string;
  canOrganize: boolean;
}) {
  const t = fr.productionNeeds.availability;
  const { availabilitySetAt: at, availabilitySetBy: by } = assignment;
  const setLine = at
    ? by
      ? t.setBy(by, formatDateTime(at))
      : t.setAt(formatDateTime(at))
    : null;
  return (
    <li className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{assignment.holder.name}</span>
          <StatusBadge
            size="sm"
            tone={productionAvailabilityTone[assignment.availability]}
          >
            {t.values[assignment.availability]}
          </StatusBadge>
        </div>
        {setLine && (
          <span className="text-caption text-[color:var(--text-secondary)]">
            {setLine}
          </span>
        )}
        {assignment.note && (
          <p className="text-sm text-muted-foreground">{assignment.note}</p>
        )}
      </div>
      {canOrganize && (
        <AssignmentActions
          projectId={projectId}
          assignment={assignment}
          needLabel={needLabel}
        />
      )}
    </li>
  );
}

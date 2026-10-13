import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import type { DirectionDecision } from "@/lib/design/direction";
import { fr } from "@/lib/i18n/fr";
import { designReviewTone } from "@/lib/ui/state-tones";

/** A decision taken on a section: what, by whom, when, and why. */
export function DecisionLine({ decision }: { decision: DirectionDecision }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={designReviewTone[decision.decision]} size="sm">
          {fr.conception.decided[decision.decision]}
        </StatusBadge>
        <span className="text-caption text-muted-foreground">
          {fr.conceptionDirection.versions.decidedBy(
            decision.decidedByName,
            formatDateTime(decision.decidedAt),
          )}
        </span>
      </div>
      {decision.comment && (
        <p className="text-body-md break-words">{decision.comment}</p>
      )}
      {decision.reserves && (
        <p className="text-body-md break-words">
          {fr.conceptionDirection.versions.reserves(decision.reserves)}
        </p>
      )}
      {decision.decidedRole === "delegate" && (
        <p className="text-caption text-muted-foreground">
          {fr.conceptionDirection.versions.asDelegate}
        </p>
      )}
    </div>
  );
}
